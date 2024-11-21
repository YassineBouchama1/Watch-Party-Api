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
  private partyRooms: Map<
    string,
    Set<{ userId: string; role: string; username: string }>
  > = new Map();
  private userSocketMap: Map<string, { username: string; role: string }> =
    new Map();

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
      const userId = socket.user._id?.toString();
      const username = socket.user.username;
      const role = socket.user.role;

      // Check if the user is already connected
      if (!this.userSocketMap.has(userId)) {
        // Store user connection details
        this.userSocketMap.set(userId, { username, role });

        console.log('User connected:', userId, 'Role:', role);

        // Notify all other users about the new user connection
        socket.broadcast.emit('user:connected', {
          userId,
          username: username || 'Guest',
          role: role,
        });
      }
    }
  }

  // Handle socket disconnections
  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.user) {
      const userId = socket.user._id?.toString();
      const username = socket.user.username;
      const role = socket.user.role;

      console.log('User Disconnected:', userId, 'Role:', role);

      // Remove user from the connection map
      this.userSocketMap.delete(userId);

      // Notify all users globally about the disconnection
      this.server.emit('user:disconnected', {
        userId,
        username,
        role,
      });



      // Notify all other users in the same party about the disconnection
      this.partyRooms.forEach((users, partyId) => {
        const userToRemove = Array.from(users).find(
          (user) => user.username === username,
        );

        if (userToRemove) {
          users.delete(userToRemove);

          // Notify other users in the party of the user leaving
          socket.to(partyId).emit('user:leaveParty', {
            userId,
            username,
            role,
          });

          // If the party room is empty, delete it
          if (users.size === 0) {
            this.partyRooms.delete(partyId);
          }
        }
      });
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

    const usersInParty = this.partyRooms.get(partyId);

    // Check if the user is already in the party
    if (
      !Array.from(usersInParty).some(
        (user) => user.username === socket.user.username,
      )
    ) {
      usersInParty.add({
        userId: socket.user._id.toString(),
        role: socket.user.role,
        username: socket.user.username,
      });

      // Notify the user of the current party members
      socket.emit('list:joinParty', Array.from(usersInParty));

      // Notify other users in the party of the new user
      socket.to(partyId).emit('user:joinParty', {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        role: socket.user.role,
      });
    }
  }

  // Handle user leaving a party
  @SubscribeMessage('leave:party')
  handleLeaveParty(socket: AuthenticatedSocket, data: { partyId: string }) {
    const { partyId } = data;
    console.log(socket.user.username, 'leave party only');

    if (!partyId || !socket.user.username) {
      return;
    }

    this.leaveParty(socket, partyId);
  }




  // this is helper function to manage user leaving a party
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
        socket.to(partyId).emit('user:leaveParty', {
          userId: socket.user._id.toString(),
          username: socket.user.username,
          role: socket.user.role,
        });
      }
    }
  }
}
