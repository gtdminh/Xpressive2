/// <reference path="xpressive.ts" />

declare var $build: any;

// Interface
interface ICaps {
    removeFeature(feature: any): void;
    addFeature(feature: any): void;
    sendPres(): void;
    generateVerificationString(): string;
    createCapsNode(): any;
    findCaps(capsNode: string): any;
    getCaps(jid: string, capsNode: string): void;
}

// Module
module Xmpp {

    // Class
    export class Caps implements ICaps {

        private capsCache: any[];
        private connection: any;

        private capsReqQ: any[];

        // Constructor
        constructor() {
            this.capsReqQ = [];
        }

        init(connection) {
            Strophe.debug("init caps plugin");

            this.connection = connection;
            this.capsCache = [];
            Strophe.addNamespace('CAPS', "http://jabber.org/protocol/caps");

            if (this.connection.disco === void 0)
                throw new Error("disco plugin required!");
            if (b64_sha1 === void 0)
                throw new Error("SHA-1 library required!");

            this.addFeature(Strophe.NS.CAPS);
            this.addFeature(Strophe.NS.DISCO_INFO);
            if (!this.connection.disco.hasIdentities()) {
                this.connection.disco.addIdentity("client", "pc", "XpressiveJS 0.2", "");
            }
        }

        statusChanged(status) {
            if (status === Strophe.Status.CONNECTED || status === Strophe.Status.ATTACHED) {
                this.connection.addTimedHandler(5000, this.requestCaps.bind(this));
            }
        }

        requestCaps(): bool {
            if (this.capsReqQ.length > 0) {
                var req = this.capsReqQ.pop();

                Strophe.debug("Capabilities info requested");
                var capsIq = $iq({
                    "type": "get",
                    "to": req.jid
                }).c("query", {
                    "node": req.capsNode,
                    "xmlns": Strophe.NS.DISCO_INFO
                });
                this.connection.sendIQ(capsIq, this.addToCache.bind(this));
            }
            return true;
        }

        findCaps(capsNode: string): any {
            return this.capsCache[capsNode];
        }

        getCaps(jid: string, capsNode: string) {
            Strophe.debug("Capabilities info request queued");
            this.capsReqQ.push({ "jid": jid, "capsNode": capsNode });
        }

        addToCache(iq) {
            try {
                Strophe.debug("Capabilities info recv'd.");
                var info = $(iq).find("query");
                var capsNode = info.attr("node");
                this.capsCache[capsNode] = info;
            } catch (ex) {
                Strophe.error("Capabilities info handler errored.");
            }
            return false;
        }

        addFeature(feature) {
            return this.connection.disco.addFeature(feature);
        }

        removeFeature(feature) {
            return this.connection.disco.removeFeature(feature);
        }

        sendPres() {
            return this.connection.send($pres().cnode(this.createCapsNode().tree()));
        }

        createCapsNode() {
            var node;
            if (this.connection.disco.hasIdentities()) {
                node = this.connection.disco.getIdentity(0).name || "";
            } else {
                node = "dummyId.name";
            }
            return $build("c", {
                xmlns: Strophe.NS.CAPS,
                hash: "sha-1",
                node: node,
                ver: this.generateVerificationString()
            });
        }

        propertySort(array, property) {
            return array.sort(function (a, b) {
                if (a[property] > b[property]) {
                    return -1;
                } else {
                    return 1;
                }
            });
        }

        generateVerificationString() {
            var S, features, i, id, ids, k, key, ns,
                 _i, _j, _k, _len, _len2, _len3, _ref, _ref2;
            ids = [];
            _ref = this.connection.disco.identities;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                i = _ref[_i];
                ids.push(i);
            }
            features = [];
            _ref2 = this.connection.disco.features;
            for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
                k = _ref2[_j];
                features.push(k);
            }
            S = "";
            this.propertySort(ids, "category");
            this.propertySort(ids, "type");
            this.propertySort(ids, "lang");
            for (key in ids) {
                id = ids[key];
                S += "" + id.category + "/" + id.type + "/" + id.lang + "/" + id.name + "<";
            }
            features.sort();
            for (_k = 0, _len3 = features.length; _k < _len3; _k++) {
                ns = features[_k];
                S += "" + ns + "<";
            }
            return "" + (b64_sha1(S)) + "=";
        }
    }

    /*
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
     * in FIPS PUB 180-1
     * Version 2.1a Copyright Paul Johnston 2000 - 2002.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for details.
     */

    /*
     * Configurable variables. You may need to tweak these to be compatible with
     * the server-side, but the defaults work in most cases.
     */
    var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
    var b64pad = ""; /* base-64 pad character. "=" for strict RFC compliance   */
    var chrsz = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

    /*
     * These are the functions you'll usually want to call
     * They take string arguments and return either hex or base-64 encoded strings
     */
    function hex_sha1(s) { return binb2hex(core_sha1(str2binb(s), s.length * chrsz)); }
    function b64_sha1(s) { return binb2b64(core_sha1(str2binb(s), s.length * chrsz)); }
    function str_sha1(s) { return binb2str(core_sha1(str2binb(s), s.length * chrsz)); }
    function hex_hmac_sha1(key, data) { return binb2hex(core_hmac_sha1(key, data)); }
    function b64_hmac_sha1(key, data) { return binb2b64(core_hmac_sha1(key, data)); }
    function str_hmac_sha1(key, data) { return binb2str(core_hmac_sha1(key, data)); }

    /*
     * Perform a simple self-test to see if the VM is working
     */
    function sha1_vm_test() {
        return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
    }

    /*
     * Calculate the SHA-1 of an array of big-endian words, and a bit length
     */
    function core_sha1(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        var w = Array(80);
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        var e = -1009589776;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;
            var olde = e;

            for (var j = 0; j < 80; j++) {
                if (j < 16) w[j] = x[i + j];
                else w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
                var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                                 safe_add(safe_add(e, w[j]), sha1_kt(j)));
                e = d;
                d = c;
                c = rol(b, 30);
                b = a;
                a = t;
            }

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
            e = safe_add(e, olde);
        }
        return Array(a, b, c, d, e);

    }

    /*
     * Perform the appropriate triplet combination function for the current
     * iteration
     */
    function sha1_ft(t, b, c, d) {
        if (t < 20) return (b & c) | ((~b) & d);
        if (t < 40) return b ^ c ^ d;
        if (t < 60) return (b & c) | (b & d) | (c & d);
        return b ^ c ^ d;
    }

    /*
     * Determine the appropriate additive constant for the current iteration
     */
    function sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 :
               (t < 60) ? -1894007588 : -899497514;
    }

    /*
     * Calculate the HMAC-SHA1 of a key and some data
     */
    function core_hmac_sha1(key, data) {
        var bkey = str2binb(key);
        if (bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

        var ipad = Array(16), opad = Array(16);
        for (var i = 0; i < 16; i++) {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
        return core_sha1(opad.concat(hash), 512 + 160);
    }

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    function rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    /*
     * Convert an 8-bit or 16-bit string to an array of big-endian words
     * In 8-bit function, characters >255 have their hi-byte silently ignored.
     */
    function str2binb(str) {
        var bin = Array();
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < str.length * chrsz; i += chrsz)
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i % 32);
        return bin;
    }

    /*
     * Convert an array of big-endian words to a string
     */
    function binb2str(bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for (var i = 0; i < bin.length * 32; i += chrsz)
            str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
        return str;
    }

    /*
     * Convert an array of big-endian words to a hex string.
     */
    function binb2hex(binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                   hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF);
        }
        return str;
    }

    /*
     * Convert an array of big-endian words to a base-64 string
     */
    function binb2b64(binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        for (var i = 0; i < binarray.length * 4; i += 3) {
            var triplet = (((binarray[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16)
                        | (((binarray[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8)
                        | ((binarray[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
            for (var j = 0; j < 4; j++) {
                if (i * 8 + j * 6 > binarray.length * 32) str += b64pad;
                else str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
            }
        }
        return str;
    }
}
// Local variables
declare var Xpressive: IXpressive;

Strophe.addConnectionPlugin('caps', (function() {
    var _caps = new Xmpp.Caps();

    return {
        init: (connection) => _caps.init(connection),
        statusChanged: (status) => _caps.statusChanged(status),
        removeFeature: (feature) => _caps.removeFeature(feature),
        addFeature: (feature) => _caps.addFeature(feature),
        sendPres: () => _caps.sendPres(),
        generateVerificationString: () => _caps.generateVerificationString(),
        createCapsNode: () => _caps.createCapsNode(),
        findCaps: (capsNode) => _caps.findCaps(capsNode),
        getCaps: (jid, capsNode) => _caps.getCaps(jid, capsNode)
    }
} ()));
