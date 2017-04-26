var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "./lib"], function (require, exports, lib_1) {
    'use strict';
    var serverUrl = 'ws://localhost:4070';
    var MsgType;
    (function (MsgType) {
        MsgType[MsgType["ANY"] = 0] = "ANY";
        MsgType[MsgType["USER_LIST"] = 1] = "USER_LIST";
        MsgType[MsgType["CONNECT"] = 2] = "CONNECT";
        MsgType[MsgType["JOIN"] = 3] = "JOIN";
        MsgType[MsgType["LEFT"] = 4] = "LEFT";
        MsgType[MsgType["MESSAGE"] = 5] = "MESSAGE";
    })(MsgType || (MsgType = {}));
    var Caller;
    (function (Caller) {
        Caller[Caller["ME"] = 0] = "ME";
        Caller[Caller["SERVER"] = 1] = "SERVER";
    })(Caller || (Caller = {}));
    var MyClient = (function (_super) {
        __extends(MyClient, _super);
        function MyClient(_url, _name, _protos) {
            var _this = _super.call(this, _url, _name, _protos) || this;
            _this._url = _url;
            _this._name = _name;
            _this._protos = _protos;
            _this.funcs = {};
            _this.onmessage = function (res, sock, ev) {
                if (_this.funcs[res.type]) {
                    _this.funcs[res.type](res);
                }
            };
            return _this;
        }
        MyClient.prototype.onaction = function (action, cb) {
            _super.prototype.onaction.call(this, action, cb);
            return this;
        };
        MyClient.prototype.on = function (name, cb) {
            if (this.funcs[name]) {
                throw new Error("message callback " + name + " already exist!");
            }
            this.funcs[name] = cb;
            return this;
        };
        return MyClient;
    }(lib_1.WS.NamedClient));
    var joinInp;
    var msgInp;
    var userList;
    var dataList;
    var conStatus;
    var cli;
    var appendMessage = function (what, who) {
        var cls = '';
        if (typeof who !== 'string') {
            cls = who === Caller.ME ? ' me' : ' server';
            who = who === Caller.ME ? 'Me' : 'Server';
        }
        var tmpl = "<span class=\"who" + cls + "\">" + who + "</span>\n              <span class=\"msg\">" + what + "</span>";
        var dummy = document.createElement('div');
        dummy.innerHTML = tmpl;
        if (cls.length) {
            dummy.classList.add(cls.trim());
        }
        dummy.classList.add('append');
        dataList.insertBefore(dummy, dataList.firstElementChild);
    };
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
    function run() {
        joinInp = document.getElementById('join');
        msgInp = document.getElementById('inp');
        userList = document.querySelector('#online ul');
        dataList = document.getElementById('console');
        conStatus = document.querySelector('.constatus');
        joinInp.addEventListener('keydown', function (e) {
            if (e.keyCode === 13 && joinInp.value.length) {
                document.body.classList.remove('init');
                document.body.classList.add('connected');
                join(joinInp.value);
            }
        });
        var join = function (who) {
            cli = new MyClient(serverUrl, who, ['p1']);
            msgInp.addEventListener('keyup', function (e) {
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
            cli.onaction('open', function () {
                cli.send({
                    type: MsgType.JOIN,
                    name: cli.name,
                    session: cli.session
                });
                conStatus.textContent = 'Connected';
                conStatus.classList.add('online');
            })
                .onaction('close', function () {
                document.body.classList.remove('connected');
                document.body.classList.add('connection-lost');
                conStatus.textContent = 'Server closed';
                conStatus.classList.remove('online');
            })
                .on(MsgType.MESSAGE, function (res) {
                appendMessage(res.data.what, res.data.who);
            })
                .on(MsgType.CONNECT, function (res) {
                msgInp.disabled = false;
            })
                .on(MsgType.JOIN, function (res) {
                appendMessage(res.data.who + ' joined', Caller.SERVER);
            })
                .on(MsgType.USER_LIST, function (res) {
                updateUserList(res.data);
            })
                .on(MsgType.LEFT, function (res) {
                appendMessage(res.data, Caller.SERVER);
            })
                .start();
        };
    }
    exports.run = run;
});
//# sourceMappingURL=app.js.map