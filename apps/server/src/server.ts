import { connectDB } from '@repo/db'
import { createServer, Server } from 'http'
import configs from './app/configs'
import app from './app'
import { logger } from '@app/libs/logger'
import { seedSuperAdmin } from '@app/libs/seed-super-admin'
import { Server as SocketServer } from 'socket.io'
import { setupChatSocket, type TChatServer } from '@app/configs/socket.gateway'

let server: Server

const boostrap = async () => {
  try {
    await connectDB(configs.databaseUrl)
    logger.info('✅ Database connected successfully!')

    await seedSuperAdmin()

    const httpServer = createServer(app)

    const io: TChatServer = new SocketServer(httpServer, {
      cors: {
        origin: configs.corsOrigins?.split(','),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    // Initialize Chat Gateway Logic
    setupChatSocket(io)

    // IMPORTANT: Listen on httpServer, NOT app
    server = httpServer.listen(configs.port, () => {
      logger.info(`🧑‍🚀🚀 Server is running on ${configs.port}`)
    })
  } catch (err) {
    logger.error(`❌ Database connection failed ❌`, err)
  }
}

boostrap()

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason })
  if (server) server.close(() => process.exit(1))
  else process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('uncaughtException: ERROR', error.message)
  process.exit(1)
})
