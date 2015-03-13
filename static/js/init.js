(function() {
  var CityNavigator, console, fn, i, len, method, methods;

  if (!window.console) {
    console = {};
    window.console = console;
    methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
    fn = function(method) {
      return console[method] = function() {};
    };
    for (i = 0, len = methods.length; i < len; i++) {
      method = methods[i];
      fn(method);
    }
  }

  $(document).bind("mobileinit", function() {
    window.console.log("mobileinit");
    $.mobile.defaultPageTransition = "slide";
    $.mobile.defaultHomeScroll = 0;
    window.citynavi.reach = typeof reach !== "undefined" && reach !== null ? reach.Api.init() : void 0;
    $.mobile.page.prototype.options.keepNative = "form input";
    $(document).ajaxStart(function(e) {
      return $.mobile.loading('show');
    });
    return $(document).ajaxStop(function(e) {
      return $.mobile.loading('hide');
    });
  });

  CityNavigator = (function() {
    function CityNavigator(opts) {
      this.source_location = null;
      this.simulation_time = null;
      this.itinerary = null;
      _.extend(this, opts);
    }

    CityNavigator.prototype.get_source_location = function() {
      return this.source_location;
    };

    CityNavigator.prototype.get_source_location_or_area_center = function() {
      return this.source_location || this.config.center;
    };

    CityNavigator.prototype.set_source_location = function(loc) {
      return this.source_location = loc;
    };

    CityNavigator.prototype.set_simulation_time = function(time) {
      return this.simulation_time = time;
    };

    CityNavigator.prototype.time = function() {
      return this.simulation_time || moment();
    };

    CityNavigator.prototype.get_itinerary = function() {
      return this.itinerary;
    };

    CityNavigator.prototype.set_itinerary = function(itinerary) {
      return this.itinerary = itinerary;
    };

    return CityNavigator;

  })();

  window.citynavi = new CityNavigator();

}).call(this);

//# sourceMappingURL=init.js.map
