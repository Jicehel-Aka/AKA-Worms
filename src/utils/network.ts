import Peer, { DataConnection } from 'peerjs';
import { NetworkMessage } from '../types/game';

export type NetworkRole = 'HOST' | 'GUEST' | 'LOCAL';

export class NetworkManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private broadcast: BroadcastChannel | null = null;
  public role: NetworkRole = 'LOCAL';
  public roomId: string = '';
  public isConnected: boolean = false;
  private onMessageCallback: ((msg: NetworkMessage) => void) | null = null;
  private onConnectCallback: (() => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  constructor() {
    // Empty initial state
  }

  public setCallbacks(
    onMessage: (msg: NetworkMessage) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ) {
    this.onMessageCallback = onMessage;
    this.onConnectCallback = onConnect || null;
    this.onDisconnectCallback = onDisconnect || null;
  }

  public generateRoomId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'AKA-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  public hostRoom(customRoomId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.role = 'HOST';
      this.roomId = (customRoomId || this.generateRoomId()).toUpperCase();

      // Local broadcast channel for instant multi-tab testing
      try {
        this.broadcast = new BroadcastChannel(`worms_aka_${this.roomId}`);
        this.broadcast.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }

      // Initialize PeerJS
      const peerId = `worms-host-${this.roomId.toLowerCase()}`;
      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          resolve(this.roomId);
        });

        this.peer.on('connection', (connection) => {
          this.conn = connection;
          this.setupConnectionHandlers();
          this.isConnected = true;
          if (this.onConnectCallback) this.onConnectCallback();
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS host error, fallback active:', err);
          // Still resolve so local broadcast can function
          resolve(this.roomId);
        });
      } catch (err) {
        console.warn('PeerJS creation failed:', err);
        resolve(this.roomId);
      }
    });
  }

  public joinRoom(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.role = 'GUEST';
      this.roomId = roomId.trim().toUpperCase();

      // Broadcast channel
      try {
        this.broadcast = new BroadcastChannel(`worms_aka_${this.roomId}`);
        this.broadcast.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }

      const peerId = `worms-guest-${this.roomId.toLowerCase()}-${Math.floor(Math.random() * 9999)}`;
      const hostPeerId = `worms-host-${this.roomId.toLowerCase()}`;

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(hostPeerId, { reliable: true });
          this.conn = conn;
          this.setupConnectionHandlers();

          conn.on('open', () => {
            this.isConnected = true;
            if (this.onConnectCallback) this.onConnectCallback();
            resolve(true);
          });

          // Timeout fallback for broadcast
          setTimeout(() => {
            if (!this.isConnected) {
              // Send ping on broadcast
              this.broadcast?.postMessage({
                type: 'ROOM_READY',
                payload: { role: 'GUEST' },
                senderId: 'GUEST',
                timestamp: Date.now(),
              });
              this.isConnected = true;
              if (this.onConnectCallback) this.onConnectCallback();
              resolve(true);
            }
          }, 2500);
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS join error:', err);
          resolve(true); // Allow local fallback
        });
      } catch (err) {
        console.warn('Peer init failed', err);
        resolve(true);
      }
    });
  }

  private setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on('data', (data) => {
      this.handleIncoming(data as NetworkMessage);
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      if (this.onDisconnectCallback) this.onDisconnectCallback();
    });

    this.conn.on('error', (err) => {
      console.warn('Connection error:', err);
    });
  }

  private handleIncoming(msg: NetworkMessage) {
    if (!msg || !msg.type) return;
    if (this.onMessageCallback) {
      this.onMessageCallback(msg);
    }
  }

  public sendMessage(type: NetworkMessage['type'], payload: any) {
    const msg: NetworkMessage = {
      type,
      payload,
      senderId: this.role,
      timestamp: Date.now(),
    };

    // Send via WebRTC if connected
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
    }

    // Also mirror to BroadcastChannel
    if (this.broadcast) {
      this.broadcast.postMessage(msg);
    }
  }

  public disconnect() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.broadcast) {
      this.broadcast.close();
      this.broadcast = null;
    }
    this.isConnected = false;
    this.role = 'LOCAL';
    this.roomId = '';
  }
}

export const network = new NetworkManager();
