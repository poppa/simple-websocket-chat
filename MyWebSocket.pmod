#require constant(Protocols.WebSocket)

inherit Protocols.WebSocket : parent;

#ifdef WSTEST_DEBUG
# define TRACE(X...)werror("%s:%d: %s",basename(__FILE__),__LINE__,sprintf(X))
#else
# define TRACE(X...)0
#endif

typedef function(mixed,Frame|void,Connection|void:void) MessageCallback;
typedef function(Frame|int,Connection:void) ActionCallback;

enum MsgType {
  MSG_TYPE_ANY,
  MSG_TYPE_USER_LIST,
  MSG_TYPE_CONNECT,
  MSG_TYPE_JOIN,
  MSG_TYPE_LEFT,
  MSG_TYPE_MESSAGE
}

class Connection
{
  inherit parent::Connection;

  private multiset(string) valid_actions = (< "close", "message", "error", "open" >);
  private mapping(MsgType:MessageCallback) msg_actions = ([]);

  protected void create(Stdio.File|SSL.File f,
                        void|int|array(object) extensions)
  {
    ::create(f, extensions);

    this::onmessage = lambda (Frame frame, Connection c) {
      mapping msg;
      mixed err = catch {
        msg = Standards.JSON.decode(frame->text);
      };

      if (msg && msg->type && msg_actions[msg->type]) {
        msg_actions[msg->type](msg, frame, c);
        return;
      }

      if (msg_actions[MSG_TYPE_ANY]) {
        msg_actions[MSG_TYPE_ANY](msg, frame, c);
      }
    };
  }

  this_program on_action(string action, ActionCallback cb)
  {
    if (!valid_actions[action]) {
      error("%O is not a valid event listener!\n", action);
    }

    this["on" + action] = cb;

    return this;
  }

  this_program on(MsgType action, MessageCallback cb)
  {
    if (msg_actions[action]) {
      error("A message action named %O already exist!\n", action);
    }

    msg_actions[action] = cb;
    return this;
  }
}
