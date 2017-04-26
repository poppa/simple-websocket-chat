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

/**
 * Alias for `console.log` if `[?&]debug=1` is in the query string.
 */
export const wdebug = document.location.search.indexOf('debug=1') > -1 ?
                      console.log : () => {};

export module WS {
  const _session: string = GUID.version4();

  export type Message = {
    session : string,
    data? : any
  };
  export type Response = {
    ok: boolean,
    data?: any,
    type: number
  };

  export type SocketAction    = 'open'|'error'|'close'|'message';
  export type ActionCallback  = (ws?: WebSocket, ev?: Event) => any;
  export type MessageCallback = (res: Response, ws?: WebSocket, ev?: MessageEvent) => any;


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
  export class Client {
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

    protected onopen:    ActionCallback;
    protected onclose:   ActionCallback;
    protected onerror:   ActionCallback;
    protected onmessage: MessageCallback;

    private readResponse(blob: Blob, mev: MessageEvent): void
    {
      const _ = this;
      const blobReader: FileReader = new FileReader();
      blobReader.onloadend = function(this: MSBaseReader, ev: ProgressEvent) {
        let _res: any = JSON.parse(blobReader.result);

        const res: Response = {
          ok: _res.ok,
          data: _res.data,
          type: _res.type
        };

        _.onmessage(res, _.sock, mev);
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


    /**
     * Send a message to the server. `msg` will be JSON stringified.
     * 
     * @param {*} msg 
     * 
     * @memberOf Client
     */
    public send(msg: any): void {
      if (this._isConnected) {
        this.sock.send(JSON.stringify(msg));
      }
    }


    /**
     * Register an action callback. `cb` will be called when an `on[action]` 
     * event is emitted.
     * 
     * @param {SocketAction} action 
     * @param {(ActionCallback|MessageCallback)} cb 
     * @returns {Client} 
     * 
     * @memberOf Client
     */
    public onaction(action: SocketAction, 
                    cb:     ActionCallback|MessageCallback): Client 
    {
      switch (action) {
        case 'open':
          this.onopen = cb as ActionCallback;
          break;
        
        case 'close':
          this.onclose = cb as ActionCallback;
          break;

        case 'error':
          this.onclose = cb as ActionCallback;
          break;

        case 'message':
          this.onmessage = cb as MessageCallback;
          break;
      }

      return this;
    }

    /**
     * Start the connection
     * @memberOf Client
     */
    public start(): void {
      const _ = this;

      this.sock = new WebSocket(this._url, this._protos);
      
      this.sock.onopen = function onopen(this: WebSocket, ev: Event): any {
        wdebug('onopen: ', this, ev);
        
        _._isConnected = true;

        if (_.onopen) {
          _.onopen(this, ev);
        }
      };
      
      this.sock.onclose = function onclose(this: WebSocket, ev: Event): any {
        wdebug('onclose: ', this, ev);

        _._isConnected = false;

        if (_.onclose) {
          _.onclose(this, ev);
        }
      };
      
      this.sock.onerror = function onerror(this: WebSocket, ev: Event): any {
        wdebug('onerror: ', this, ev);

        if (_.onerror) {
          _.onerror(this, ev);
        }
      };

      this.sock.onmessage =  function onmessage(this: WebSocket, ev: MessageEvent): any {
        wdebug('onmessage: ', this, ev);
        
        if (_.onmessage) {
          _.readResponse(ev.data, ev);
        }
      };
    }
  }

  
  /**
   * Named client
   * 
   * @export
   * @class NamedClient
   * @extends {Client}
   */
  export class NamedClient extends Client {

    /**
     * Creates an instance of NamedClient.
     * @param {string} _url 
     * @param {string} _name 
     * @param {(string|string[])} [_protos] 
     * 
     * @memberOf NamedClient
     */
    constructor(protected _url: string, protected _name: string,
                protected _protos?: string|string[]) 
    {
      super(_url, _protos);
    }


    /**
     * Get the name
     * 
     * @readonly
     * @type {string}
     * @memberOf NamedClient
     */
    get name(): string {
      return this._name;
    }
  }
}
