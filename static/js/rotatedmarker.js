(function() {
  L.RotatedMarker = L.Marker.extend({
    options: {
      angle: 0
    },
    _setPos: function(pos) {
      L.Marker.prototype._setPos.call(this, pos);
      if (L.DomUtil.TRANSFORM) {
        return this._icon.style[L.DomUtil.TRANSFORM] += " rotate(" + this.options.angle + "deg)";
      }
    }
  });

  L.rotatedMarker = function(pos, options) {
    return new L.RotatedMarker(pos, options);
  };

}).call(this);

//# sourceMappingURL=rotatedmarker.js.map
