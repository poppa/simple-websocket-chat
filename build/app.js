define(["require", "exports", "./lib"], function (require, exports, lib_1) {
    'use strict';
    var serverUrl = 'ws://localhost:4070';
    var MsgType;
    (function (MsgType) {
        MsgType[MsgType["DEFAULT"] = 0] = "DEFAULT";
        MsgType[MsgType["USER_LIST"] = 1] = "USER_LIST";
        MsgType[MsgType["CONNECT"] = 2] = "CONNECT";
        MsgType[MsgType["JOIN"] = 3] = "JOIN";
        MsgType[MsgType["LEFT"] = 4] = "LEFT";
    })(MsgType || (MsgType = {}));
    var Caller;
    (function (Caller) {
        Caller[Caller["ME"] = 0] = "ME";
        Caller[Caller["SERVER"] = 1] = "SERVER";
    })(Caller || (Caller = {}));
    function run() {
        var joinInp = document.getElementById('join');
        var msgInp = document.getElementById('inp');
        var userList = document.querySelector('#online ul');
        var dataList = document.getElementById('console');
        var conStatus = document.querySelector('.constatus');
        joinInp.addEventListener('keydown', function (e) {
            if (e.keyCode === 13 && joinInp.value.length) {
                document.body.classList.remove('init');
                document.body.classList.add('connected');
                join(joinInp.value);
            }
        });
        var appendMessage = function (what, who) {
            var cls = '';
            if (typeof who !== 'string') {
                cls = who === Caller.ME ? ' me' : ' server';
                who = who === Caller.ME ? 'Me' : 'Server';
            }
            var tmpl = "<div><span class=\"who" + cls + "\">" + who + "</span>\n                <span class=\"msg\">" + what + "</span></div>";
            dataList.innerHTML += tmpl;
        };
        var join = function (who) {
            var cli = lib_1.WS.createNamedClient(who, serverUrl, ['p1']);
            var updateUserList = function (users) {
                var out = '';
                users.forEach(function (user) {
                    if (user.session === cli.session) {
                        out += '<li class="me">You</li>';
                    }
                    else {
                        out += "<li>" + user.name + "</li>";
                    }
                });
                userList.innerHTML = out;
            };
            msgInp.addEventListener('keyup', function (e) {
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
            cli.onopen = function (ws, ev) {
                cli.send({
                    type: MsgType.JOIN,
                    name: cli.name,
                    session: cli.session
                });
                conStatus.textContent = 'Connected';
                conStatus.classList.add('online');
            };
            cli.onclose = function (ws) {
                document.body.classList.remove('connected');
                document.body.classList.add('connection-lost');
                conStatus.textContent = 'Server closed';
                conStatus.classList.remove('online');
            };
            cli.onmessage = function (res, sock, ev) {
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
            };
            cli.start();
        };
    }
    exports.run = run;
});
//# sourceMappingURL=app.js.map