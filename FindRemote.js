/*________________________________________________________
|                  FindRemote v1.1                        |
|                                                         |
| Author : Phil Bri ( 11/2014 )                           |
| Description :                                           |
|    Finding connected object's Plugin for SARAH project  |
|    (See http://encausse.wordpress.com/s-a-r-a-h/)       |
|_________________________________________________________|
*/
var FindObj = require('./lib/findconnected.js');

exports.action = function ( data , callback , config , SARAH ) {
	var config      = config.modules.FindRemote;
    var searchStr   = config.search;

    if (! /friendlyName|manufacturer|modelName|modelDescription/gi.test(searchStr)) {
        console.log ( 'FindRemote => Options possibles : friendlyName ou manufacturer ou modelName ou modelDescription !' );
        return callback ({ 'tts': 'Erreur vérifiez les options du plugin' });
    }

    var reqFind = {
		whatStr : searchStr,
		timeout : 5000,
		verbose : true,
	};

	var objFind = new FindObj(reqFind);
	
	var getObjects = function () {
		SARAH.speak ( "Recherche des objets.");
		callback ({});
		objFind.getObjects ( reqFind );
	};

	var haveObjects = function ( ipTab ) {
		my_Objects = ipTab;
		SARAH.speak ( "Vous avez " + Object.keys(ipTab).length + " objets.", function() {
			SARAH.speak ( listObjects (ipTab), function () {
				SARAH.speak ( 'Recherche terminée.' );
			});
		});
		callback ({});
	};

	var listObjects = function ( ipTab ) {
		var str = '';
		for (var key in ipTab)
			str = str + ( /(.+?)(?=:)|(.+)/.exec(key)[0] + ' à l\'adresse '+ ipTab[key]['ip'].substring(8) + ', ' );
		return str;
	}

	objFind.on ( 'authenticate', getObjects );
	objFind.on ( 'have-objects', haveObjects );
}
