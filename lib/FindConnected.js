/*________________________________________________________
|                  FindConnected v1.1                     |
|                                                         |
| Author : Phil Bri ( 11/2014 )                           |
| Description :                                           |
|    Lib used by FindRemote plugin for SARAH project      |
|    (See http://encausse.wordpress.com/s-a-r-a-h/)       |
|_________________________________________________________|
*/
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var access_flag;

var FindObj = function ( station ) {
    EventEmitter.call(this);
    this.authenticate(station);
    // DEBUG => Loging Listeners...
    //this.on('newListener', function(listener) {console.log('Event Listener: ' + listener); });
};

util.inherits(FindObj, EventEmitter);

// Get list of our local IPv4 addresses
FindObj.prototype.authenticate = function (station) {
    var os      = require ("os");
    var self = this;

    // Get list of our local IPv4 addresses
    var interfaces  = os.networkInterfaces();
    var addresses   = [];

    for ( var devName in interfaces ) {

        for ( var i = 0; i < interfaces[devName].length; i++ ) {

            if ( interfaces[devName][i].family != 'IPv4' ) continue;
            if ( interfaces[devName][i].internal ) continue;
            addresses.push ( interfaces[devName][i].address );
        }
    }

    access_flag = addresses;
    // emit 'authenticate' event instantly
    setTimeout(function() {
        self.emit('authenticate', access_flag);
    }, 0);
    return this;
};

// Sen dUDP Datagram (Broadcast and Multicast)
FindObj.prototype.getObjects = function ( station ) {

    var dgram   = require ( "dgram" );
    var self = this;

    var timeout = station.timeout,
        findNode = station.whatStr,
        verbose = station.verbose
        addresses = access_flag;

    if (! access_flag) {
        return this.on ( 'authenticate', function () {
           this.getObjects ( station );
       });
    }

    var socket = dgram.createSocket ( 'udp4' );
    
    socket.bind ( 12121, access_flag ); // Binding to the fist finding local ip (IPV4)

    socket.on ('listening', function () {

        socket.setBroadcast ( true );
        socket.setMulticastTTL ( 128 );
        addresses.forEach ( function ( address ) {
            socket.addMembership ( '239.255.255.250', address );
        });

        var udpSend = new Buffer (
            "M-SEARCH * HTTP/1.1\r\n" +
            "HOST: 239.255.255.250:1900\r\n" +
            "MAN: \"ssdp:discover\"\r\n" +
            "MX: 5\r\n" +
            "ST: ssdp:all\r\n\r\n"
        );
        var timer = null;

        socket.send ( udpSend, 0, udpSend.length, 1900, '239.255.255.250', function () {

            timer = setTimeout ( function () { 
                socket.close ();
                self.emit ( 'have-objects', ipTab );
                return this;
            }, timeout ); // 'Discovery timeout expired !'
        });
    });

    var ipTab = {};

    socket.on ( 'message', function ( msg, rinfo ) {

        xmlParse ( msg, findNode, function (clbk) {
            var realKey = Object.keys ( clbk )[0];  // For case insensitive search => Retrieve the true value of 'findNode'
            ipTab[ clbk[realKey] ] = { 'ip' : rinfo.address, 'httpAdrs' : clbk[ 'httpAdrs' ] }
        });
    });

    socket.on ( 'close', function () {

        for (var key in ipTab)
            if ( verbose )
                console.log ( key + " = " + ipTab[key]['httpAdrs']);
    });

    socket.on ( 'error', function ( err ) { 

        callback ( 'Socket error : ' + err.message );
    });

    return this;
};

// Reading infos and parsing results
var xmlParse = function ( msg, fNode, clbk) {
    
    var http = require( 'http' );
    var ipRet ={};

    msg = msg.toString ( 'utf-8' );
    
    if (( msg = msg.toString()).search ( /upnp/ ) != -1 ) return;
    
    msg = msg.slice ( msg.search ( /location:/i ) + 10 );
    msg = msg.slice ( 0, msg.search ( '\r\n' ));

    var req = http.get ( msg, function ( res ) {

        res.setEncoding ( 'utf-8' );
        res.on ( 'data', function ( chunk ) {

            var myRegEx = new RegExp ( '<(' + fNode + ')>(.*?)<\/' + fNode + '>', 'mi' ).exec( chunk );

            if ( myRegEx) {
                ipRet[ myRegEx[1] ] = myRegEx[2];
                ipRet[ 'httpAdrs' ] = msg;
            }
        });

        res.on ( 'end', function () {
            // Return findNode request)
            clbk ( ipRet );
        });
    });

    req.on ( 'error', function ( err ) {

        console.log ( "Request erreur = " + err.message );
    });

    req.end ();
};

module.exports = FindObj;
