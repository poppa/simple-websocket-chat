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
  DEFAULT,
  USER_LIST,
  CONNECT,
  JOIN,
  LEFT
}

enum Caller {
  ME,
  SERVER
}

type OnlineUser = { name: string, session: string };

type Who = string|Caller; 

export function run(): void {
  const joinInp:  HTMLInputElement = document.getElementById('join')      as HTMLInputElement;
  const msgInp:   HTMLInputElement = document.getElementById('inp')       as HTMLInputElement;
  const userList: HTMLDivElement   = document.querySelector('#online ul') as HTMLDivElement;
  const dataList: HTMLDivElement   = document.getElementById('console')   as HTMLDivElement;
  const conStatus: HTMLSpanElement = document.querySelector('.constatus') as HTMLSpanElement;

  joinInp.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.keyCode === 13 && joinInp.value.length) {
      document.body.classList.remove('init');
      document.body.classList.add('connected');
      join(joinInp.value);
    }
  });

  const appendMessage = (what: string, who?: Who): void => {
    let cls = '';
    if (typeof who !== 'string') {
      cls = who == Caller.ME ? ' me' : ' server';
      who = who == Caller.ME ? 'Me' : 'Server';
    }

    let tmpl = `<div><span class="who${cls}">${who}</span><span class="msg">${what}</span></div>`;
    dataList.innerHTML += tmpl;
  }

  const join = (who: string) => {
    let cli: WS.WSNamedClient = WS.createNamedClient(who, serverUrl, [ 'p1' ]);

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

    msgInp.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.keyCode === 13 && msgInp.value.length) {
        cli.send({
          type: MsgType.DEFAULT,
          text: msgInp.value,
          session: cli.session,
          name: cli.name
        });

        appendMessage(msgInp.value, Caller.ME);
        msgInp.value = '';
      }
    });

    cli.onopen = (ws: WebSocket, ev: Event): any => {
      cli.send({
        type: MsgType.JOIN,
        name: cli.name,
        session: cli.session
      });

      conStatus.textContent = 'Connected';
      conStatus.classList.add('online');
    }

    cli.onclose = (ws: WebSocket): any => {
      document.body.classList.remove('connected');
      document.body.classList.add('connection-lost');
      conStatus.textContent = 'Server closed';
      conStatus.classList.remove('online');
    }

    cli.onmessage = (res: WS.WSResponse, sock: WebSocket, ev: Event): any => {
      console.log('res: ', res);

      switch (res.type) {
        case MsgType.CONNECT: 
          msgInp.disabled = false;
          break;

        case MsgType.JOIN:
          appendMessage(res.data.who + ' joined', Caller.SERVER);
          break;

        case MsgType.USER_LIST:
          updateUserList(res.data);
          break;

        case MsgType.LEFT:
          appendMessage(res.data, Caller.SERVER);
          break;

        default:
          console.log('Default message');
          appendMessage(res.data.what, res.data.who);
          break;
      }
    }

    cli.start();
  };
}