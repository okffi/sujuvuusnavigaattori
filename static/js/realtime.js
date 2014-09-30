(function() {
  var Realtime;

  Realtime = (function() {
    function Realtime() {
      this.client = new Faye.Client(citynavi.config.faye_url);
      this.subs = {};
    }

    Realtime.prototype.subscribe_route = function(route_id, callback, callback_args) {
      var path, route_path, sub;
      if (this.subs[route_id]) {
        this.unsubscribe_route(route_id);
      }
      route_path = route_id.replace(/\ /g, "_").replace(/:/g, "-");
      path = "/location/" + citynavi.config.id + "/" + route_path + "/**";
      sub = this.client.subscribe(path, function(message) {
        return callback(message, callback_args);
      });
      return this.subs[route_id] = sub;
    };

    Realtime.prototype.unsubscribe_route = function(route_id) {
      if (!this.subs[route_id]) {
        return;
      }
      this.subs[route_id].cancel();
      return delete this.subs[route_id];
    };

    return Realtime;

  })();

  citynavi.realtime = new Realtime;

}).call(this);

//# sourceMappingURL=realtime.js.map
