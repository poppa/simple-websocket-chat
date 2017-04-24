#!/usr/bin/env pike
/*
  Author: Pontus Östlund <https://github.com/poppa>

  Permission to copy, modify, and distribute this source for any legal
  purpose granted as long as my name is still attached to it. More
  specifically, the GPL, LGPL and MPL licenses apply to this software.
*/

#require constant(Protocols.WebSocket)

import Protocols.WebSocket;

typedef Protocols.HTTP.Server.Request RequestID;
typedef Protocols.WebSocket.Request WSRequestID;

#ifdef WSTEST_DEBUG
# define TRACE(X...)werror("%s:%d: %s",basename(__FILE__),__LINE__,sprintf(X))
#else
# define TRACE(X...)0
#endif

#define LOCK_CONS()   Thread.MutexKey lock = mux->lock()
#define UNLOCK_CONS() lock = 0

constant MY_PORT = 4070;

Thread.Mutex mux = Thread.Mutex();
array(Subscriber) subscribers = ({});

int main(int argc, array(string) argv)
{
  mixed err = catch {
    write("Starting server on port %d\n", MY_PORT);
    Protocols.WebSocket.Port(handle_http, handle_ws, MY_PORT);
    return -1;
  };

  werror("Error starting server on port %d: %s\n", MY_PORT,
         describe_error(err));
}

enum MsgType {
  MSG_TYPE_DEFAULT,
  MSG_TYPE_USER_LIST,
  MSG_TYPE_CONNECT,
  MSG_TYPE_JOIN,
  MSG_TYPE_LEFT
}

private string encode_message(mixed data, void|MsgType type)
{
  return Standards.JSON.encode(([
    "ok"   : Val.true,
    "data" : data,
    "type" : type
  ]));
}

Subscriber get_subscriber(string session)
{
  LOCK_CONS();
  foreach (subscribers, Subscriber s) {
    if (s->session == session) {
      UNLOCK_CONS();
      return s;
    }
  }
}

variant Subscriber get_subscriber(Connection con)
{
  LOCK_CONS();
  foreach (subscribers, Subscriber s) {
    if (s->connection == con) {
      UNLOCK_CONS();
      return s;
    }
  }
}


array(Subscriber) get_other_subscribers(Connection con)
{
  LOCK_CONS();
  return filter(subscribers, lambda (Subscriber s) {
    return s->connection != con;
  });
}

Subscriber add_subscriber(Connection c)
{
  Subscriber s = Subscriber(c);
  LOCK_CONS();
  subscribers += ({ s });
  UNLOCK_CONS();
  return s;
}

Subscriber remove_subscriber(Connection con)
{
  Subscriber s = get_subscriber(con);
  LOCK_CONS();
  subscribers -= ({ s });
  UNLOCK_CONS();
  return s;
}

void send_user_list()
{
  LOCK_CONS();
  array u;
  u = map(subscribers,
          lambda (Subscriber s) {
            return ([
              "name"    : s->name,
              "session" : s->session
            ]);
          });
  sort(u->name, u);
  subscribers->broadcast(MSG_TYPE_USER_LIST, u);
  UNLOCK_CONS();
}

private void handle_ws(array(string) proto, WSRequestID id)
{
  TRACE("Got connection request: %O, %O\n", proto, id);

  Connection con;
  con = id->websocket_accept(sizeof(proto) && proto[0]);

  con->onopen = lambda (mixed a, void|mixed b) {
    TRACE("con->onopen(%O, %O)\n", a, b);
  };

  con->onmessage = lambda (Frame frame, Connection c) {
    mapping msg;
    mixed err = catch {
      msg = Standards.JSON.decode(frame->text);
    };

    if (msg) {
      TRACE("Message: %O\n", msg);
      Subscriber s = get_subscriber(c);

      switch (msg->type)
      {
        case MSG_TYPE_JOIN:
          s->update(msg->name, msg->session);
          send_user_list();
          get_other_subscribers(c)
            ->broadcast(MSG_TYPE_JOIN, ([ "who" : s->name ]));
          break;

        case MSG_TYPE_USER_LIST:
          send_user_list();
          break;

        default:
          get_other_subscribers(c)
            ->broadcast(MSG_TYPE_DEFAULT,
                        ([ "who" : s->name, "what" :  msg->text ]));
          break;
      }
    }
    else {
      TRACE("Error: %O\n", describe_error(err));
    }
  };

  con->onclose = lambda (int status, Connection c) {
    TRACE("con->onclose(%O, %O)\n", status, c);
    Subscriber s = remove_subscriber(c);
    TRACE("Remove subscriber: %O\n", s);
    c->onopen = c->onmessage = c->onclose = 0;
    subscribers->broadcast(MSG_TYPE_LEFT, "%s left!", s && s->name||"Unknown");
    send_user_list();
  };

  Subscriber s = add_subscriber(con);

  s->broadcast(MSG_TYPE_CONNECT, "I'm alive");
}

private void handle_http(RequestID id)
{
  id->response_and_finish(([
    "data"  : "Not implemented",
    "type"  : "text/plain",
    "error" : 501
  ]));
}


class Subscriber
{
  private Connection _con;
  private string _name;
  private string _session;

  protected void create(Connection con)
  {
    _con = con;
  }

  public void update(string name, string sess)
  {
    _name = name;
    _session = sess;
  }

  public Connection `connection() { return _con; }
  public string `name() { return _name; }
  public string `session() { return _session; }

  public void broadcast(MsgType t, strict_sprintf_format text,
                        sprintf_args ... args)
  {
    _con->send_binary(encode_message(sprintf(text, @args), t));
  }

  variant public void broadcast(MsgType t, mixed complex)
  {
    _con->send_binary(encode_message(complex, t));
  }

  protected string _sprintf(int t)
  {
    return sprintf("%O(%O, %O)", object_program(this),
                   _name||"(Unnamed)", _session||"(no session");
  }
}
