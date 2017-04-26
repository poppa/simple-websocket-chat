/*
  Author: Pontus Östlund <https://github.com/poppa>

  Permission to copy, modify, and distribute this source for any legal
  purpose granted as long as my name is still attached to it. More
  specifically, the GPL, LGPL and MPL licenses apply to this software.
*/

'use strict';

import { WS } from './lib';

const serverUrl: string = 'ws://localhost:4070';

enum MsgType {
  ANY,
  USER_LIST,
  CONNECT,
  JOIN,
  LEFT,
  MESSAGE
}

enum Caller {
  ME,
  SERVER
}

type OnlineUser = { name: string, session: string };
type Who = string|Caller; 

class MyClient extends WS.NamedClient
{
  private funcs: { [name: number]: (mess: WS.Response) => any  } = {};

  constructor(protected _url: string, protected _name: string,
              protected _protos?: string|string[]) 
  {
    super(_url, _name, _protos);

    this.onmessage = (res: WS.Response, sock: WebSocket, ev: Event): any => {
      if (this.funcs[res.type]) {
        this.funcs[res.type](res);
      }
    }
  }

  public onaction(action: WS.SocketAction, 
                  cb: WS.ActionCallback|WS.MessageCallback): MyClient 
  {
    super.onaction(action, cb);
    return this;
  }

  public on(name: MsgType, cb: (mess: WS.Response) => any): MyClient {
    if (this.funcs[name]) {
      throw new Error(`message callback ${name} already exist!`);
    }

    this.funcs[name] = cb;

    return this;
  }
}

let joinInp:   HTMLInputElement;
let msgInp:    HTMLInputElement;
let userList:  HTMLDivElement;
let dataList:  HTMLDivElement;
let conStatus: HTMLSpanElement;

let cli: MyClient;

const appendMessage = (what: string, who?: Who): void => {
  let cls = '';
  if (typeof who !== 'string') {
    cls = who === Caller.ME ? ' me' : ' server';
    who = who === Caller.ME ? 'Me' : 'Server';
  }

  let tmpl = `<div><span class="who${cls}">${who}</span>
              <span class="msg">${what}</span></div>`;
  dataList.innerHTML += tmpl;
}


const updateUserList = (users: OnlineUser[]): void => {
  let out: string = '';

  users.forEach(user => {
    if (user.session === cli.session) {
      out += '<li class="me">You</li>';
    }
    else {
      out += `<li>${user.name}</li>`;
    }
  });

  userList.innerHTML = out;
}

/**
 * Run the application
 * 
 * @export
 */
export function run(): void {
  joinInp   = document.getElementById('join')      as HTMLInputElement;
  msgInp    = document.getElementById('inp')       as HTMLInputElement;
  userList  = document.querySelector('#online ul') as HTMLDivElement;
  dataList  = document.getElementById('console')   as HTMLDivElement;
  conStatus = document.querySelector('.constatus') as HTMLSpanElement;

  joinInp.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.keyCode === 13 && joinInp.value.length) {
      document.body.classList.remove('init');
      document.body.classList.add('connected');
      join(joinInp.value);
    }
  });

  const join = (who: string) => {
    cli = new MyClient(serverUrl, who, [ 'p1' ]);

    msgInp.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.keyCode === 13 && msgInp.value.length) {
        cli.send({
          type: MsgType.MESSAGE,
          text: msgInp.value,
          session: cli.session,
          name: cli.name
        });

        appendMessage(msgInp.value, Caller.ME);
        msgInp.value = '';
      }
    });

    cli.onaction('open', () => {
      cli.send({
        type: MsgType.JOIN,
        name: cli.name,
        session: cli.session
      });

      conStatus.textContent = 'Connected';
      conStatus.classList.add('online');
    })
    .onaction('close', () => {
      document.body.classList.remove('connected');
      document.body.classList.add('connection-lost');
      conStatus.textContent = 'Server closed';
      conStatus.classList.remove('online');
    })
    .on(MsgType.MESSAGE, (res: WS.Response): any => {
      appendMessage(res.data.what, res.data.who);    
    })
    .on(MsgType.CONNECT, (res: WS.Response): any => {
      msgInp.disabled = false;
    })
    .on(MsgType.JOIN, (res: WS.Response): any => {
      appendMessage(res.data.who + ' joined', Caller.SERVER);
    })
    .on(MsgType.USER_LIST, (res: WS.Response): any => {
      updateUserList(res.data);
    })
    .on(MsgType.LEFT, (res: WS.Response): any => {
      appendMessage(res.data, Caller.SERVER);
    })
    .start();
  };
}
