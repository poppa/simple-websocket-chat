#!/usr/bin/env pike
/*
  Author: Pontus Östlund <https://github.com/poppa>

  Permission to copy, modify, and distribute this source for any legal
  purpose granted as long as my name is still attached to it. More
  specifically, the GPL, LGPL and MPL licenses apply to this software.
*/

#require constant(Protocols.WebSocket)

// Change to what ever float your boat
constant MY_PORT = 4070;

import .MyWebSocket;

typedef Request WSRequestID;

#ifdef WSTEST_DEBUG
# define TRACE(X...)werror("%s:%d: %s",basename(__FILE__),__LINE__,sprintf(X))
#else
# define TRACE(X...)0
#endif

#define LOCK_CONS()   Thread.MutexKey lock = mux->lock()
#define UNLOCK_CONS() lock = 0

Thread.Mutex mux = Thread.Mutex();
array(Subscriber) subscribers = ({});

int main(int argc, array(string) argv)
{
  mixed err = catch {
    write("Starting server on port %d\n", MY_PORT);
    Port(UNDEFINED, handle_ws, MY_PORT);
    return -1;
  };

  werror("Error starting server on port %d: %s\n", MY_PORT,
         describe_error(err));
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
  TRACE("Got connection request: %O, %O\n", proto*", ", id);
  Connection con = id->websocket_accept(sizeof(proto) && proto[0]);

  con
    // Join chat
    ->on(MSG_TYPE_JOIN,
         lambda (mixed m, Frame f, Connection c) {
           Subscriber s = get_subscriber(c);
           s->update(m->name, m->session);
           send_user_list();
           get_other_subscribers(c)
             ->broadcast(MSG_TYPE_JOIN, ([ "who" : s->name ]));
         })
    // List users online
    ->on(MSG_TYPE_USER_LIST,
         lambda (mixed m, Frame f, Connection c) {
           send_user_list();
         })
    // Handle message
    ->on(MSG_TYPE_MESSAGE,
         lambda (mixed m, Frame f, Connection c) {
           Subscriber s = get_subscriber(c);
           m->text = string_to_utf8(m->text);
           get_other_subscribers(c)
             ->broadcast(MSG_TYPE_MESSAGE,
                         ([ "who" : s->name, "what" :  m->text ]));
         })
    // Catch anything
    ->on(MSG_TYPE_ANY,
         lambda (mixed m, Frame f, Connection c) {
           TRACE("Unknown message type!\n");
         })
    // Connection closed
    ->on_action("close",
         lambda (int status, Connection c) {
           TRACE("con->onclose(%O)\n", status);
           Subscriber s = remove_subscriber(c);
           TRACE("Remove subscriber: %O\n", s);
           // c->onopen = c->onmessage = c->onclose = 0;
           subscribers->broadcast(MSG_TYPE_LEFT, "%s left!",
                                  s && s->name||"Unknown");
           send_user_list();
           destruct(s);
         });

  Subscriber s = add_subscriber(con);

  s->broadcast(MSG_TYPE_CONNECT, "I'm alive");
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
    _name = string_to_utf8(name);
    _session = sess;
  }

  public Connection `connection()
  {
    return _con;
  }

  public string `name()
  {
    return _name;
  }

  public string `session()
  {
    return _session;
  }

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

#ifdef WSTEST_DEBUG
  protected void destroy()
  {
    TRACE("Subscriber %O destructed\n", _name);
  }
#endif
}
