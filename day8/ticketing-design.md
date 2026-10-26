# TicketHub Design Document

TicketHub is a website that sells tickets for concerts and events. This document follows the six-part framework: requirements, estimates, API, data model, architecture and trade-offs.

## 1. Requirements

### Functional
- Users can register, log in and browse upcoming events.
- Users can see which seats are available for an event.
- Users can hold seats temporarily while they pay.
- Users can pay for held seats and receive tickets.
- Users can view their purchased tickets.
- Held seats that are not paid for are released automatically.

### Non-functional
- **Correctness (most important):** a seat must never be sold to two people. Money and tickets must always agree.
- **Speed:** browsing pages load in under 1 second; a hold request answers in under 500 ms, even during a big sale.
- **Fairness:** during a big sale, people are served in the order they arrived, and bots or refresh-spamming cannot jump the line.
- **Availability:** the site stays up during the big sale, and a failed server does not lose orders.
- **Scalability:** it handles the normal day and a sudden spike of about 550 times normal traffic.
- **Security:** payment details are handled by a payment provider, passwords are hashed, and all traffic uses HTTPS.
- **Durability:** a paid ticket is never lost.

## 2. Estimates

Assumptions: 1 day = 86,400 s; normal peak = 5x the average; during the big sale each of the 200,000 users makes about 10 requests in 10 minutes (600 s).

### Normal day
- Page views: 50,000 x 10 = 500,000 per day, about **6/s** on average and **30/s** at peak
- Tickets sold: 5,000 per day, about **0.06/s** on average and **0.3/s** at peak

### Big sale (200,000 users, 20,000 seats, 10 minutes)
- Requests: 200,000 x 10 = 2,000,000, about **3,300/s**
- Hold attempts: 200,000 / 600 = about **333/s**
- Successful sales: 20,000 / 600 = about **33/s** on average (higher if the seats sell out early)

### Comparison
- Page views are about **550 times** the normal rate, and 10 minutes of sale traffic equals 4 times a whole normal day's page views.
- Hold and purchase attempts are thousands of times the normal rate.
- Only 10% of the people trying can succeed, so most requests must fail fast and clearly ("sold out").
- Conclusion: normal days are easy and read-heavy, but the big sale is a short, extreme spike that needs special handling.

## 3. API

Base path: `/api/v1`. All endpoints except the event browsing ones need `Authorization: Bearer <token>`.

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/events` | List upcoming events (paginated) | 200 |
| GET | `/events/{id}` | Details of one event | 200 |
| GET | `/events/{id}/seats` | Seat map with status of each seat | 200 |
| POST | `/events/{id}/holds` | Hold one or more seats for 5 minutes | 201 |
| DELETE | `/holds/{id}` | Release a hold early | 204 |
| POST | `/orders` | Pay for a hold and create the order | 201 |
| GET | `/me/tickets` | List the current user's tickets | 200 |

### Example: hold seats

`POST /api/v1/events/12/holds`

```json
{ "seatIds": [301, 302] }
```

Response `201 Created`:

```json
{
  "holdId": "h_8841",
  "eventId": 12,
  "seatIds": [301, 302],
  "expiresAt": "2026-11-02T18:05:00Z"
}
```

### Example: pay

`POST /api/v1/orders`

```json
{ "holdId": "h_8841", "paymentToken": "tok_abc123" }
```

Response `201 Created`:

```json
{ "orderId": 5521, "status": "paid", "totalCents": 240000, "ticketIds": [9001, 9002] }
```

### Errors
- **400** invalid request (for example no seats chosen)
- **401** not logged in
- **404** event or hold not found
- **409 Conflict** a seat is already held or sold by someone else
- **410 Gone** the hold has expired
- **429 Too Many Requests** the user is sending requests too fast, or has not yet been admitted from the waiting room
- **402** payment failed
- **500** unexpected server error

## 4. Data model

### users
| Column | Type | Rules |
|---|---|---|
| id | INTEGER | Primary key |
| email | TEXT | Required, unique |
| name | TEXT | Required |
| password_hash | TEXT | Required |

### events
| Column | Type | Rules |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | Required |
| venue | TEXT | Required |
| starts_at | TEXT | Required |
| on_sale_at | TEXT | Required |

### seats
| Column | Type | Rules |
|---|---|---|
| id | INTEGER | Primary key |
| event_id | INTEGER | Foreign key to events(id), required |
| section | TEXT | Required |
| row_label | TEXT | Required |
| seat_number | INTEGER | Required |
| price_cents | INTEGER | Required |
| status | TEXT | 'available', 'held' or 'sold' |
| held_by | INTEGER | Foreign key to users(id), null unless held |
| hold_expires_at | TEXT | Null unless held |

A `UNIQUE (event_id, section, row_label, seat_number)` rule means the same physical seat cannot be created twice.

### orders
| Column | Type | Rules |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), required |
| event_id | INTEGER | Foreign key to events(id), required |
| status | TEXT | 'pending', 'paid', 'cancelled' |
| total_cents | INTEGER | Required |
| payment_ref | TEXT | Unique, so one payment cannot create two orders |
| created_at | TEXT | Required |

### tickets (links orders and seats)
| Column | Type | Rules |
|---|---|---|
| id | INTEGER | Primary key |
| order_id | INTEGER | Foreign key to orders(id) |
| seat_id | INTEGER | Foreign key to seats(id), **UNIQUE** |

### Relationships
- **users to orders: one-to-many.** A user can place many orders; each order has one user.
- **events to seats: one-to-many.** An event has many seats; each seat belongs to one event.
- **events to orders: one-to-many.** An order is for one event.
- **orders to seats: many-to-many through tickets.** An order can contain several seats, and over time a seat may appear in a cancelled order and then a later one. The `tickets` table holds one row per seat sold. Its `UNIQUE (seat_id)` rule means a seat can only be on one ticket.

### CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  venue      TEXT NOT NULL,
  starts_at  TEXT NOT NULL,
  on_sale_at TEXT NOT NULL
);

CREATE TABLE seats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        INTEGER NOT NULL,
  section         TEXT NOT NULL,
  row_label       TEXT NOT NULL,
  seat_number     INTEGER NOT NULL,
  price_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'held', 'sold')),
  held_by         INTEGER,
  hold_expires_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (held_by)  REFERENCES users(id),
  UNIQUE (event_id, section, row_label, seat_number)
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  event_id    INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_cents INTEGER NOT NULL,
  payment_ref TEXT UNIQUE,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE tickets (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  seat_id  INTEGER NOT NULL UNIQUE,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (seat_id)  REFERENCES seats(id)
);

CREATE INDEX idx_seats_event_status ON seats(event_id, status);
```

The index on `seats(event_id, status)` makes "show the available seats for this event" fast, which is the most common query in the big sale.

## 5. Preventing two people from buying the same seat

Double-booking is a race condition. Two people click the same seat at almost the same moment, both servers see "available" and both sell it. We prevent it with three layers, so one failure of one layer is still caught by the next.

### Layer 1: an atomic, conditional hold

The server never reads the status and then writes it. It uses one `UPDATE` that checks and changes the seat in a single step:

```sql
UPDATE seats
SET status = 'held',
    held_by = :user_id,
    hold_expires_at = datetime('now', '+5 minutes')
WHERE id = :seat_id
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < datetime('now')));
```

The database lets only one such statement change a given row at a time. If two users send this at once, one will change 1 row and the other 0 rows. The server checks the number of rows changed: **1 means you got the seat, 0 means someone else did, so return 409 Conflict.**

### Layer 2: a transaction for several seats

When a user holds several seats, all the updates run inside one transaction (`BEGIN ... COMMIT`). If any seat returns 0 rows, the server runs `ROLLBACK`, so the user gets all of their seats or none, never half. Seats are always updated in ascending id order, so two buyers wanting overlapping seats cannot deadlock each other.

### Layer 3: a constraint as the last line of defence

When the order is paid, the server inserts a row in `tickets`. Because `tickets.seat_id` is **UNIQUE**, the database itself refuses to create a second ticket for the same seat. Even if a bug or a race got past layers 1 and 2, the second insert fails and the transaction is rolled back, so double-selling is impossible.

### Holds, payment and expiry
- A hold lasts 5 minutes. When payment starts, the order is created as `pending` and the hold is extended by 2 minutes so the payment can finish.
- After payment succeeds, one transaction marks the seats `sold` (only where `held_by` is this user and the hold is still valid) and inserts the tickets.
- A worker runs every minute and releases seats whose hold has expired, and cancels their pending orders.
- `payment_ref` is unique, so if the payment provider sends the same confirmation twice, only one order is created.

## 6. Architecture

```
                 +--------------------------+
                 |     Client (web/app)     |
                 +------------+-------------+
                              |
                              v
                 +--------------------------+
                 |           DNS            |
                 +------------+-------------+
                              |
                              v
                 +--------------------------+
                 |  CDN (pages, images,     |
                 |  event info, static JS)  |
                 +------------+-------------+
                              | API requests
                              v
                 +--------------------------+
                 | Waiting room / rate      |
                 | limiter (admits a fixed  |
                 | number of users at a time)|
                 +------------+-------------+
                              |
                              v
                 +--------------------------+
                 |      Load balancer       |
                 +-----+-------------+------+
                       |             |
                +------+-----+ +-----+------+
                | App server | | App server |  ... auto-scaled
                |     #1     | |     #2     |
                +--+---+--+--+ +--+---+--+--+
                   |   |  |       |   |  |
      +------------+   |  +-------+---+  +--------------+
      |                |          |                     |
      v                v          v                     v
 +---------+   +--------------+  +------------------+  +------------------+
 |  Cache  |   |  Primary DB  |  |  Message queue   |  | Payment provider |
 | (Redis) |   |  (all holds, |  +--------+---------+  | (external)       |
 | seat map|   |   sales)     |           |            +------------------+
 +---------+   +------+-------+           v
                      |           +---------------+
                      | replicate | Workers:      |
                      v           | - release     |
               +--------------+   |   expired     |
               | Read replica |   |   holds       |
               | (browsing)   |   | - send ticket |
               +--------------+   |   emails      |
                                  +---------------+
```

### What each component does
- **Client:** the browser or app where people browse events, choose seats and pay.
- **DNS:** turns the TicketHub name into the address of our system, so users never need an IP address.
- **CDN:** serves event pages, images and scripts from locations near users, so the huge number of page views at sale time never reaches our servers.
- **Waiting room / rate limiter:** lets only a fixed number of users into the purchase flow at once and puts the rest in a fair, first-come queue, so the core system is never flooded.
- **Load balancer:** spreads requests across the app servers and stops sending traffic to any that fail.
- **App servers:** run the API logic (holds, orders, tickets) and keep no data themselves, so more can be started automatically when the sale begins.
- **Cache:** keeps the seat map and event details in memory for a second or two, so thousands of people looking at the map do not each hit the database.
- **Primary database:** the single source of truth for seats, holds and orders, and the only place that decides who gets a seat.
- **Read replica:** answers browsing queries (events, ticket history), keeping that load off the primary.
- **Message queue:** holds background jobs so a purchase can finish without waiting for slow work such as email.
- **Workers:** take jobs from the queue, such as releasing expired holds and sending ticket emails.
- **Payment provider:** an external service that takes the card payment, so we never store card numbers.

### How it survives the big sale
- **The CDN absorbs the page-view flood.** Event pages, images and scripts are static, so most of the 3,300 requests per second never reach the app.
- **The waiting room turns a spike into a steady flow.** If it admits, say, 2,000 users at a time, the database sees a controlled number of hold requests instead of 200,000 people at once. It is also fair, because people are admitted in arrival order.
- **The cache serves the seat map.** The map is cached for 1 to 2 seconds, so thousands of viewers cost a handful of database reads. The cache is only for display. The hold itself is always decided by the primary database.
- **App servers are stateless and auto-scaled.** We start extra servers before the sale begins, because we know the time in advance.
- **Writes stay small.** Each hold is one short transaction, and only about 33 successful sales per second are needed, which one primary database can handle.
- **Slow work is off the critical path.** Emails and clean-up run through the queue.
- **Sold out is cheap to say.** Once all seats are sold, the status is cached and the server returns "sold out" without touching the database.

## 7. Trade-offs

- **Waiting room: fairness and stability vs convenience.** Users wait in line and may feel frustrated, but the system stays up and nobody can win by hammering refresh. Without it, the site could crash and everyone would lose.
- **Cached seat map: speed vs accuracy.** A seat may look available for a second after it was taken, so some users will click it and get a "409 seat taken" message. We accept this, because the database still prevents double-booking and the cache saves the primary from overload.
- **Hold length: fewer abandoned seats vs fair payment time.** A 5-minute hold gives people time to pay, but seats held by people who never pay are unavailable to others during that time. A shorter hold frees seats faster but rushes buyers and increases failed payments.
- **One primary database: correctness vs scale.** One primary decides every seat, so there is a single source of truth and double-booking is easy to prevent. The cost is that all writes go through one machine. At about 33 sales per second this is fine, and for many concerts at once we could shard the data by event.
- **Failure handling:** the database and cache use replicas with automatic failover, there are at least two load balancers and app servers in different data centres, and the queue stores messages on several machines. No single component's failure should take the system down.
