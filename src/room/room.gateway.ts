import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthenticatedSocket, createSocketMiddleware } from '../common/socket.middleware';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';

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
export class PartyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private partyRooms: Map<string, Set<string>> = new Map();
  private activeRooms: Map<string, Set<string>> = new Map();
  private userSocketMap: Map<string, string> = new Map();

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}
  afterInit(server: Server) {
    const middleware = createSocketMiddleware(this.jwtService, this.userModel);
    server.use(middleware);
  }

  handleConnection(socket: AuthenticatedSocket) {
    if (socket.user) {
      const userId = socket.user._id
        ? socket.user._id.toString()
        : socket.user.username;
      this.userSocketMap.set(userId, socket.id);
      console.log('User connected:', userId);
      this.server.emit('user:connected', {
        userId,
        username: socket.user.username || 'Guest',
      });
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      const userId = socket.user._id
        ? socket.user._id.toString()
        : socket.user.username;
      this.userSocketMap.delete(userId);
      console.log('User disconnected:', userId);
      this.server.emit('user:disconnected', {
        userId,
        username: socket.user.username || 'Guest',
      });
    }
  }

  @SubscribeMessage('join:party')
  handleJoinParty(
    socket: AuthenticatedSocket,
    data: { partyId: string },
  ) {


    
       console.log('joined');
       console.log(this.partyRooms);
    const { partyId } = data;

    if (!partyId || !socket.user.username) {
      return;
    }

    socket.join(partyId);

    if (!this.partyRooms.has(partyId)) {
      this.partyRooms.set(partyId, new Set());
    }
    this.partyRooms.get(partyId).add(socket.user.username);

    // Notify the user of the current party members
    const usersInParty = Array.from(this.partyRooms.get(partyId));
    socket.emit('userConnectedParty', usersInParty);

    // Notify other users in the party of the new user
    socket
      .to(partyId)
      .emit('user:connected', { username: socket.user.username });

  }

  @SubscribeMessage('leave:party')
  handleLeaveParty(
    socket: AuthenticatedSocket,
    data: { partyId: string },
  ) {
 
    const { partyId } = data;
    if (!partyId || !socket.user.username) {
      return;
    }

    this.leaveParty(socket, partyId,  socket.user.username);
  }

  private leaveParty(
    socket: AuthenticatedSocket,
    partyId: string,
    username?: string,
  ) {
    
    socket.leave(partyId);

    if (this.partyRooms.has(partyId)) {
      const users = this.partyRooms.get(partyId);
      if (username) {
        users.delete(username);
      }

      if (users.size === 0) {
        this.partyRooms.delete(partyId);
      } else {
        // Notify other users in the party of the user leaving
        socket.to(partyId).emit('user:disconnected', { username });
      }
    }
  }
}
