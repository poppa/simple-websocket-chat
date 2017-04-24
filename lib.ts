/*
  Author: Pontus Östlund <https://github.com/poppa>

  Permission to copy, modify, and distribute this source for any legal
  purpose granted as long as my name is still attached to it. More
  specifically, the GPL, LGPL and MPL licenses apply to this software.
*/

'use strict';

export namespace GUID {
  export function version4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }
}

export module WS {
  const _session: string = GUID.version4();

  export type WSClient = Client;
  export type WSNamedClient = NamedClient;
  export type WSMessage = {
    session : string,
    data? : any
  };
  export type WSResponse = {
    ok: boolean,
    data?: any,
    type: number
  };


  /**
   * Factory method for creating a client
   * 
   * @export
   * @param {string} url 
   * @param {(string|string[])} [protos] 
   * @returns {Client} 
   */
  export function createClient(url: string, protos?: string|string[]): Client {
    return new Client(url, protos);
  }


  /**
   * Factory method for creating a named client
   * 
   * @export
   * @param {string} name 
   * @param {string} url 
   * @param {(string|string[])} protos 
   * @returns {NamedClient} 
   */
  export function createNamedClient(name: string, url: string, 
                                    protos?: string|string[]): NamedClient
  {
    return new NamedClient(url, name, protos);
  }


  /**
   * Basic client
   * 
   * @class Client
   */
  class Client {
    /**
     * The WebSocket connection object
     * @private
     * @type {WebSocket}
     * @memberOf Client
     */
    private sock: WebSocket;

    /**
     * Are we connected or not
     * @private
     * @type {boolean}
     * @memberOf Client
     */
    private _isConnected: boolean = false;

    public onopen:    (ws: WebSocket, ev: Event) => any;
    public onclose:   (ws: WebSocket, ev: Event) => any;
    public onerror:   (ws: WebSocket, ev: Event) => any;
    public onmessage: (res: WSResponse, ws?: WebSocket, ev?: Event) => any;

    private readResponse(blob: Blob): void
    {
      const _ = this;
      const blobReader: FileReader = new FileReader();
      blobReader.onloadend = function(this: MSBaseReader, ev: ProgressEvent) {
        let _res: any = JSON.parse(blobReader.result);

        const res: WSResponse = {
          ok: _res.ok,
          data: _res.data,
          type: _res.type
        };
        
        _.onmessage(res, _.sock, ev);
      };

      blobReader.readAsText(blob);
    }

    /**
     * Creates an instance of Client.
     * @param {string} _url 
     * @param {(string|string[])} [_protos] 
     * 
     * @memberOf Client
     */
    constructor(protected _url: string, protected _protos?: string|string[]) {
    }


    /**
     * Getter for the session ID.
     * @readonly
     * @type {string}
     * @memberOf Client
     */
    get session(): string {
      return _session;
    }


    /**
     * Check if we're connected or not
     * @readonly
     * @type {boolean}
     * @memberOf Client
     */
    get isConnected(): boolean {
      return this._isConnected;
    }

    public send(msg: any): void {
      if (this._isConnected) {
        this.sock.send(JSON.stringify(msg));
      }
    }

    /**
     * Start the connection
     * @memberOf Client
     */
    public start(): void {
      const _ = this;

      this.sock = new WebSocket(this._url, this._protos);
      
      this.sock.onopen = function onopen(this: WebSocket, ev: Event): any {
        console.log('onopen: ', this, ev);

        if (_.onopen) {
          _._isConnected = true;
          _.onopen(this, ev);
        }
      };
      
      this.sock.onclose = function onclose(this: WebSocket, ev: Event): any {
        console.log('onclose: ', this, ev);
        _._isConnected = false;
        if (_.onclose) {
          _.onclose(this, ev);
        }
      };
      
      this.sock.onerror = function onerror(this: WebSocket, ev: Event): any {
        console.log('onerror: ', this, ev);
        if (_.onerror) {
          _.onerror(this, ev);
        }
      };

      this.sock.onmessage =  function onmessage(this: WebSocket, ev: MessageEvent): any {
        console.log('onmessage: ', this, ev);
        
        if (_.onmessage) {
          _.readResponse(ev.data);
        }
      };
    }
  }



  /**
   * Named client
   * 
   * @class NamedClient
   * @extends {Client}
   */
  class NamedClient extends Client {

    constructor(protected _url: string, protected _name: string,
                protected _protos?: string|string[]) 
    {
      super(_url, _protos);
    }

    get name(): string {
      return this._name;
    }
  }
}