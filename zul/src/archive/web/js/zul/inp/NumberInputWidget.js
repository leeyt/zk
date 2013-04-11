/* NumberInputWidget.js

	Purpose:
		
	Description:
		
	History:
		Fri May 27 16:12:42 TST 2011, Created by jumperchen

Copyright (C) 2011 Potix Corporation. All Rights Reserved.

This program is distributed under GPL Version 3.0 in the hope that
it will be useful, but WITHOUT ANY WARRANTY.
*/
(function () {
	var _allowKeys,
		globallocalizedSymbols = {};

	// Fixed merging JS issue
	zk.load('zul.lang', function () {
		_allowKeys = "0123456789"+zk.MINUS+zk.PERCENT+(zk.groupingDenied ? '': zk.GROUPING);
	});
/**
 * A skeletal implementation for number-type input box.
 * @since 5.0.8
 */
zul.inp.NumberInputWidget = zk.$extends(zul.inp.FormatWidget, {
	$define: { //zk.def
		/** Returns the rounding mode.
		 * <ul>
		 * <li>0: ROUND_UP</li>
		 * <li>1: ROUND_DOWN</li>
		 * <li>2: ROUND_CEILING</li>
		 * <li>3: ROUND_FLOOR</li>
		 * <li>4: ROUND_HALF_UP</li>
		 * <li>5: ROUND_HALF_DOWN</li>
		 * <li>6: ROUND_HALF_EVEN</li>
		 * <li>7: ROUND_UNNECESSARY</li>
		 * </ul>
		 * @return int
		 */
		/** Sets the rounding mode.
		 * <ul>
		 * <li>0: ROUND_UP</li>
		 * <li>1: ROUND_DOWN</li>
		 * <li>2: ROUND_CEILING</li>
		 * <li>3: ROUND_FLOOR</li>
		 * <li>4: ROUND_HALF_UP</li>
		 * <li>5: ROUND_HALF_DOWN</li>
		 * <li>6: ROUND_HALF_EVEN</li>
		 * <li>7: ROUND_UNNECESSARY</li>
		 * </ul>
		 * @param int rounding mode
		 */
		rounding: null,
		localizedSymbols: [
			function (val) {
				if(val) {
					var ary = jq.evalJSON(val);
					if (!globallocalizedSymbols[ary[0]])
						globallocalizedSymbols[ary[0]] = ary[1];
					return globallocalizedSymbols[ary[0]];
				} 
				return val;
			},
			function () {
				var symbols = this._localizedSymbols;
				this._allowKeys = symbols ?
					"0123456789"+symbols.MINUS+symbols.PERCENT +
					(zk.groupingDenied ? '': symbols.GROUPING): null;
				this.rerender();
			}
		]
	},
	/** Returns a string of keystrokes that are allowed.
	 * @return String
	 * @since 5.0.8
	 */
	getAllowedKeys_: function () {
		return this._allowKeys || _allowKeys;
	},
	doKeyPress_: function(evt){
		//Bug ZK-1373: ALTGR + 3 key in Spanish keyboard is a combination of Ctrl + Alt + 3 for £á sign.
		if (evt.ctrlKey && evt.altKey)
			evt.stop();
		if (!this._shallIgnore(evt, this.getAllowedKeys_()))
			this.$supers('doKeyPress_', arguments);
	},
	getType: function () {
		// ZK-1585: Strange behavior of decimalbox on iOS and Android
		//   European locale (e.g. Italian) uses ',' for decimal point. 
		//   However, Safari Mobile would trim the number string '123,45' to '123'
		//   if that string is entered into input type='number'. 
		return zk.mobile ? ((zk.DECIMAL == '.') ? 'number' : 'text') : this._type;
	}
});
})();

(function () { // disable format for number input element on tablet
if (zk.mobile) {
	var _xFormatWidget = {};
	zk.override(zul.inp.NumberInputWidget.prototype, _xFormatWidget, {
		setFormat: zk.$void
	});
}
})();