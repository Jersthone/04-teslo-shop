import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer} from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessagesWsGateway implements OnGatewayConnection, OnGatewayDisconnect{
  @WebSocketServer() wss: Server;
  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService
    ) {}
  
  async handleConnection(client: Socket) {
    //console.log("Client disconnected: ", client.id);
    //console.log({ conectados: this.messagesWsService.getConnectedClients() });
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;

    try {
      payload  = this.jwtService.verify(token);
      await this.messagesWsService.registeClient( client, payload.id );
    } catch (error) {
      client.disconnect();
      return;
    }

    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients());
  }

  handleDisconnect(client: Socket) {
    //console.log("Client connected: ", client.id);
    //console.log({ conectados: this.messagesWsService.getConnectedClients() });
    this.messagesWsService.removeClient( client.id );
    this.wss.emit('clients-updated', this.messagesWsService.getConnectedClients());
  }

  //message-from-client
  @SubscribeMessage('message-from-client')
  onMessageFromClient(client: Socket, payload: NewMessageDto){

    //! Emite unicamente al cliente
    // client.emit('message-from-client',{
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no message'
    // });

    //! Emitir a todos menos al cliente
    // client.broadcast.emit('message-from-client',{
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no message'
    // });

    //! Emitir a todos
    this.wss.emit('message-from-server',{
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || 'no message'
    });

  }
}
