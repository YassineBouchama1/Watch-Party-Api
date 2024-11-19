import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../common/socket.middleware';
import { Injectable } from '@nestjs/common';

interface CallParticipant {
  userId: string;
  username: string;
  muted: boolean;
  videoOff: boolean;
}

interface CallRoom {
  type: 'video' | 'audio';
  participants: Map<string, CallParticipant>;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
     ) {}
  @WebSocketServer()
  server: Server;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private activeRooms: Map<string, Set<string>> = new Map();
  private userSocketMap: Map<string, string> = new Map();

  handleConnection(socket: AuthenticatedSocket) {
    if (socket.user) {
      this.userSocketMap.set(socket.user._id.toString(), socket.id);
      console.log('User connected:', socket.user._id.toString());
      // Broadcast to all clients that a user has connected
      this.server.emit('user:connected', {
        userId: socket.user._id.toString(),
      });
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      this.userSocketMap.delete(socket.user._id.toString());
      console.log('User disconnected:', socket.user._id.toString());
      // Broadcast to all clients that a user has disconnected
      this.server.emit('user:disconnected', {
        userId: socket.user._id.toString(),
      });
    }
  }

}
