import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  createSocketMiddleware,
} from '../common/socket.middleware';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model } from 'mongoose';

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

  // Maps to track party rooms and user connections
  private partyRooms: Map<string, Set<{ role: string; username: string }>> =
    new Map();
  private userSocketMap: Map<string, string> = new Map();

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // Initialize middleware for socket authentication
  afterInit(server: Server) {
    const middleware = createSocketMiddleware(this.jwtService, this.userModel);
    server.use(middleware);
  }

  // Handle new socket connections
  handleConnection(socket: AuthenticatedSocket) {
    if (socket.user) {
      const userId = socket.user._id
        ? socket.user._id.toString()
        : socket.user.username;
      // Store user connection details
      this.userSocketMap.set(userId, socket.id);

      console.log('User connected:', userId, 'Role:', socket.user.role);

      // Notify all users about the new user connection
      this.server.emit('user:connected', {
        userId,
        username: socket.user.username || 'Guest',
        role: socket.user.role,
      });
    }
  }

  // Handle socket disconnections
  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      const userId = socket.user._id
        ? socket.user._id.toString()
        : socket.user.username;

      console.log('User disconnected:', userId);

      // Check if the user was in any party and notify those parties
      this.partyRooms.forEach((users, partyId) => {
        const userToRemove = Array.from(users).find(
          (user) => user.username === socket.user.username,
        );

        if (userToRemove) {
          users.delete(userToRemove);
          // Notify other users in the party of the user leaving
          socket.to(partyId).emit('user:disconnectedParty', {
            username: socket.user.username,
            role: socket.user.role,
          });

          console.log('leave party and website ')
          // If the party room is empty, delete it
          if (users.size === 0) {
            this.partyRooms.delete(partyId);
          }
        }
      });

      // Remove user from the connection map
      this.userSocketMap.delete(userId);
    }
  }

  // Handle user joining a party
  @SubscribeMessage('join:party')
  handleJoinParty(socket: AuthenticatedSocket, data: { partyId: string }) {
    const { partyId } = data;

    if (!partyId || !socket.user.username) {
      return;
    }

    console.log(
      'User joining party:',
      partyId,
      'username:',
      socket.user.username,
    );
    // Add the user to the specified party room
    socket.join(partyId);

    if (!this.partyRooms.has(partyId)) {
      this.partyRooms.set(partyId, new Set());
    }
    this.partyRooms.get(partyId).add({
      role: socket.user.role,
      username: socket.user.username,
    });

    // Notify the user of the current party members
    const usersInParty = Array.from(this.partyRooms.get(partyId));
    socket.emit('list:ConnectedParty', usersInParty);

    // Notify other users in the party of the new user
    socket.to(partyId).emit('user:connectedParty', {
      username: socket.user.username,
      role: socket.user.role,
    });
  }

  // Handle user leaving a party
  @SubscribeMessage('leave:party')
  handleLeaveParty(socket: AuthenticatedSocket, data: { partyId: string }) {
    const { partyId } = data;
          console.log('leave party only');

    console.log('User', socket.user.username, 'leaving party:', partyId);
    if (!partyId || !socket.user.username) {
      return;
    }

    this.leaveParty(socket, partyId);
  }

  // helper function to manage user leaving a party
  private leaveParty(socket: AuthenticatedSocket, partyId: string) {



    // Remove the user from the specified party room
    socket.leave(partyId);

    if (this.partyRooms.has(partyId)) {
      const users = this.partyRooms.get(partyId);


      
      // Find and remove the user from the party room by username
      const userToRemove = Array.from(users).find(
        (user) => user.username === socket.user.username,
      );

      if (userToRemove) {
        users.delete(userToRemove);
      }

      // If the party room is empty, delete it
      if (users.size === 0) {
        this.partyRooms.delete(partyId);
      } else {
        // Notify other users in the party of the user leaving
        socket.to(partyId).emit('user:disconnectedParty', {
          username: socket.user.username,
          role: socket.user.role,
        });
      }
    }
  }
}
