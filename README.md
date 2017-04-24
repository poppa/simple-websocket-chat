# Simple WebSocket Chat
This is a simple WebSocket chat, both client and server. This is in no way a production application, but is rather just an example of how WebSockets can be used.

## Compile

To compile the Typescript files you'll, of course, need a Typescript compiler installed. If you have that just run `tsc` in the directory.

The `.scss` file can be compiled by any SCSS compiler. You can use [Koala](http://koala-app.com/) for instance.

## Running the server

You will need [Pike](http://pike.lysator.liu.se/) 8.0+ to run the server  since the WebSocket module is required. If that's installed it's just a matter of running the program from the command line: `./server.pike`. The server will listen on port `4070` by default, but can be changed to what ever float your boat in `server.pike`. 
