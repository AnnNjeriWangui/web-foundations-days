# SnapShare Scaling Plan

SnapShare is a photo-sharing platform where community members upload high-resolution images and browse a personalized feed consisting of posts from users they follow.

## 1. Assumptions

- 10,000,000 registered users
- 10% daily active rate yields **1,000,000 daily active users (DAU)**
- Each active user uploads an average of 1 photo per day
- Each active user views 50 feed pages every day
- Average image payload: 2 MB per original photo, plus an accompanying 50 KB thumbnail
- Seconds per day: 86,400 (24 hours × 60 minutes × 60 seconds)
- Peak traffic volume factor: 5× the average rate
- Metric / decimal storage convention: 1 TB = 1,000 GB = 1,000,000 MB

## 2. Estimates

### Uploads
- Uploads per day: 1,000,000 × 1 = 1,000,000
- Average throughput: 1,000,000 / 86,400 = about **12 uploads per second** (11.57/s)
- Peak throughput (5×): about **58 uploads per second** (11.57 × 5 ≈ 57.87/s)

### Feed views
- Feed views per day: 1,000,000 × 50 = 50,000,000
- Average throughput: 50,000,000 / 86,400 = about **579 views per second** (578.7/s)
- Peak throughput (5×): about **2,900 views per second** (578.7 × 5 ≈ 2,893.5/s)

### Storage
- Original photos: 1,000,000 × 2 MB = 2 TB per day
- Thumbnails: 1,000,000 × 50 KB = 50 GB (0.05 TB) per day
- Total daily storage: 2 TB + 0.05 TB = 2.05 TB per day
- Total annual storage: 2.05 TB per day × 365 = about **748 TB per year** (730 TB originals + 18.25 TB thumbnails, roughly 0.75 PB)

## 3. Read-heavy or write-heavy?

SnapShare is heavily **read-heavy**. With 50 feed views for every 1 upload, requests maintain a 50:1 read-to-write ratio. 

As a result, the architectural design focuses on making reads fast, inexpensive, and resilient: image assets are served through a Content Delivery Network (CDN), popular feeds and profile data are kept in memory caches, and database read queries are distributed across read replicas. Writes require high reliability and durability, while computationally intensive tasks—such as thumbnail generation—are offloaded to asynchronous background processing.

## 4. Why photos are not stored in the database

Storing large binary image files directly in a relational database degrades overall system efficiency and increases infrastructure costs. Storing 2 MB photos for an annual accumulation of around 730 TB would balloon the database footprint, making routine index maintenance, backups, and point-in-time recovery operations excessively slow and fragile. Furthermore, dedicated database disk storage and RAM cost significantly more per gigabyte than object storage solutions. Reading binary blobs through the database also monopolizes active database connections and worker threads that are vital for executing rapid transactional queries. Lastly, a Content Delivery Network (CDN) cannot natively fetch and cache files stored inside database rows.

Instead, binary image files are stored in **object storage** (such as Amazon S3), while the database stores only metadata (such as photo ID, user ID, direct object storage URLs, captions, timestamps, and processing status).

## 5. Architecture diagram

```
        Users (phones / browsers)
          |                  |
   images | (GET)            | API calls (feed, upload)
          v                  v
      +-------+       +---------------+
      |  CDN  |       | Load balancer |
      +---+---+       +-------+-------+
          | miss              |
          |            +------+------+------+
          |            v             v      v
          |        +--------+   +--------+ +--------+
          |        |  App   |   |  App   | |  App   |  (stateless)
          |        | server |   | server | | server |
          |        +---+----+   +---+----+ +---+----+
          |            |            |          |
          |            +------------+----------+
          |            |       |        |       |
          v            v       v        v       v
   +-------------+  +-------+ +-----------+ +---------------+
   |   Object    |  | Cache | | Primary DB| | Message queue |
   |   storage   |  |(Redis)| | (writes)  | +-------+-------+
   | originals + |  +-------+ +-----+-----+         |
   | thumbnails  |                  |               v
   +------^------+                  | replicates +---------------+
          |                         v            |   Thumbnail   |
          |                  +--------------+    |   worker(s)   |
          |                  | Read replica |    +-------+-------+
          |                  | (feed reads) |            |
          |                  +--------------+            |
          +----------------------------------------------+
            worker reads the original, saves the thumbnail,
            then updates the photo's row in the primary DB
```

## 6. What each component does

- **CDN:** Stores cached copies of photos and thumbnails at edge locations close to users, ensuring fast image delivery and shielding backend servers from the bulk of asset traffic.
- **Load balancer:** Evenly distributes incoming user requests across multiple application servers to prevent hotspots and automatically bypasses unhealthy server instances.
- **App servers:** Execute core application logic statelessly (authentication, upload handling, feed assembly) and can easily scale up or down based on demand.
- **Cache:** Keeps frequently queried data (like user feeds and active profiles) in memory to reduce database query volume and minimize read latency.
- **Primary database:** Serves as the authoritative source of truth for user profiles, follower relationships, and photo metadata, accepting all write operations to guarantee consistency.
- **Read replica:** Maintains an asynchronous copy of the primary database to serve feed read requests, offloading read pressure from the primary database.
- **Object storage:** Provides highly scalable, durable, and cost-effective distributed storage suited for holding petabytes of original photos and thumbnails.
- **Message queue:** Holds thumbnail generation tasks in a resilient queue so upload requests can complete rapidly without waiting for image processing.
- **Thumbnail worker:** Retrieves tasks from the message queue, fetches original images from object storage, generates 50 KB thumbnails, uploads them, and updates the database status.

## 7. Upload flow

1. The user selects a photo and taps the upload button in the mobile app or browser.
2. The incoming request passes through the load balancer to an available stateless app server.
3. The app server verifies user authentication, checks file type validity, and confirms the photo is within size limits.
4. The app server stores the original photo file directly in object storage.
5. The app server inserts a record into the primary database with photo metadata (photo ID, owner ID, storage URL, timestamp, and status "processing").
6. The app server pushes a "create thumbnail" job onto the message queue.
7. The app server responds to the user with an "upload received" confirmation immediately, without waiting for thumbnail rendering.
8. A thumbnail worker pulls the job from the message queue, downloads the original photo from object storage, and creates a 50 KB thumbnail.
9. The worker saves the thumbnail into object storage and updates the photo's database record to status "ready".
10. The photo becomes accessible in followers' feeds, with feed metadata queried from cache or read replicas and image files served via the CDN.

## 8. Trade-offs

- **Cache speed vs. fresh data:** Caching feed results delivers sub-millisecond read latency and protects databases from read traffic spikes, but users might see feeds that are a few seconds stale until the cache is invalidated or expired.
- **Read replica vs. consistency:** Read replicas scale read capacity effectively, but slight replication lag means a freshly published photo might take a brief moment to appear on read replica queries. This eventual consistency is an acceptable trade-off for social feeds.
- **Background thumbnails vs. instant results:** Asynchronous task processing via message queues keeps upload response times fast and absorbs traffic bursts, but thumbnails are not instantly available, requiring the UI to accommodate a brief "processing" state.
- **Cost vs. performance:** Implementing CDNs, managed caches, and multi-tier database instances increases monthly hosting expenses, but at 2,900 peak views per second and roughly 748 TB of yearly data growth, a single-server setup would suffer severe bottlenecks and downtime.
