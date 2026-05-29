import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class JobsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribe_job')
  handleSubscribeJob(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`job_${data.jobId}`);
    return { event: 'subscribed', data: { jobId: data.jobId } };
  }

  emitJobProgress(jobId: string, progress: number, status: string) {
    const payload = { jobId, progress, status };
    this.server.emit('job_progress', payload);
    this.server.to(`job_${jobId}`).emit('job_progress', payload);
  }

  emitJobDone(jobId: string, workbookId: string) {
    const payload = { jobId, workbookId };
    this.server.emit('job_done', payload);
    this.server.to(`job_${jobId}`).emit('job_done', payload);
  }

  emitJobError(jobId: string, error: string) {
    const payload = { jobId, error };
    this.server.emit('job_error', payload);
    this.server.to(`job_${jobId}`).emit('job_error', payload);
  }
}
