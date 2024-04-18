import Redis from 'ioredis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'

const redis = new Redis({
    host: REDIS_HOST,
    port: 6379,
})

export default redis