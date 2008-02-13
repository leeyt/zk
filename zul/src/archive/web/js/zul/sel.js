/* sel.js

{{IS_NOTE
	Purpose:
		zk.Selectable
	Description:
		
	History:
		Fri Aug 26 08:45:55     2005, Created by tomyeh
}}IS_NOTE

Copyright (C) 2005 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
	This program is distributed under GPL Version 2.0 in the hope that
	it will be useful, but WITHOUT ANY WARRANTY.
}}IS_RIGHT
*/
zk.load("zul.zul");

////
//Customization
/** Returns the background color for a list item or tree item.
 * Developer can override this method by providing a different background.
 */
if (!window.Selectable_effect) { //define it only if not customized
	window.Selectable_effect = function (row, undo) {
		if (undo) {
			zk.rmClass(row, "overseld");
			zk.rmClass(row, "overd");
		} else
			zk.addClass(row, zk.hasClass(row, "seld") ? "overseld": "overd");
	};
}
var _zkselx = {};
_zkselx.addAft = zkau.cmd1.addAft;
zkau.cmd1.addAft = function (uuid, cmp, html) {
	if (cmp && _zkselx._addChd(uuid, cmp, html)) return true;
	_zkselx.addAft(uuid, cmp, html);
};
_zkselx.addBfr = zkau.cmd1.addBfr;
zkau.cmd1.addBfr = function (uuid, cmp, html) {
	if (cmp && _zkselx._addChd(uuid, cmp, html)) return true;
	_zkselx.addBfr(uuid, cmp, html);
};
_zkselx._addChd = function (uuid, cmp, html) {
	var h = html.trim(), from = h.indexOf("Lit");
	var isLit = h.indexOf("<tr") == 0 && from > -1 && from < h.indexOf(">");
	if (isLit && $type(cmp) != "Lit") { // only first listitem.
		var head = $parentByTag(cmp, "DIV");
		var cave = $e($uuid(head) + "!cave");	
		if (cave.tBodies[0].rows.length) {
			var n = cave.tBodies[0].rows[0];
			var to = n.previousSibling;
			zk.insertHTMLBefore(n, html);
			zkau._initSibs(n, to, false);
		} else {
			zk.insertHTMLBeforeEnd(cave.tBodies[0], html);			
			zkau._initChildren(cave.tBodies[0]);
		}
		return true;
	}
	return false;
};

////
// Seletable //
zk.Selectable = Class.create();
zk.Selectable.prototype = {
	initialize: function (cmp) {
		this.id = cmp.id;
		zkau.setMeta(cmp, this);		
		this.qcells = [];
		this.init();
	},
	init: function (isLater) {
		this.element = $e(this.id);
		if (!this.element) return;
		if (getZKAttr(this.element, "vflex") == "true") {
			if (zk.ie) this.element.style.overflow = "hidden"; 
			// added by Jumper for IE to get a correct offsetHeight so we need 
			// to add this command faster than the this._calcSize() function.
			var hgh = this.element.style.height;
			if (!hgh || hgh == "auto") this.element.style.height = "99%"; // avoid border 1px;
		}
		//_headtbl might be null, while other must be NOT null
		this.body = $e(this.id + "!body");
		if (this.body) {
			this.body.style.overflow = "";
			this.bodytbl = zk.firstChild(this.body, "TABLE", true);
			if (this.bodytbl) {
				var bds = this.bodytbl.tBodies;
				if (!bds || !bds.length)
					this.bodytbl.appendChild(document.createElement("TBODY"));
				this.bodyrows = bds[0].rows;
			}

			this.head = $e(this.id + "!head");
			if (this.head) this.headtbl = zk.firstChild(this.head, "TABLE", true);
			this.foot = $e(this.id + "!foot");
			if (this.foot) this.foottbl = zk.firstChild(this.foot, "TABLE", true);
		} else {
			this.paging = true;
			this.body = $e(this.id + "!paging");
			this.bodytbl = zk.firstChild(this.body, "TABLE", true);

			var bs = this.bodytbl.tBodies;
			for (var j = 0, bl = bs.length; j < bl; ++j)
				if (bs[j].id) {
					this.bodyrows = bs[j].rows;
					break;
				}
		}

		if (!zk.isRealVisible(this.element)) return;

		if (!this.bodyrows) {
			alert(mesg.INVALID_STRUCTURE + this.id);
			return;
		}

		var meta = this; //the nested function only see local var
		if (!this._inited) {
			this._inited = true;

			//If Mozilla, we have to eat keystrokes, or the page
			//will scroll when UP/DOWN is pressed
			if (zk.gecko) {
				this.element.onkeydown = this.element.onkeyup
				= this.element.onkeypress = function (evt) {
					var target = Event.element(evt);
					if (zkSel._shallIgnoreEvent(target))
						return true;

					if (evt) {
						switch (Event.keyCode(evt)) {
						case 33: //PgUp
						case 34: //PgDn
						case 38: //UP
						case 40: //DOWN
						case 37: //LEFT
						case 39: //RIGHT
						case 32: //SPACE
						case 36: //Home
						case 35: //End
							Event.stop(evt);
							return false;
						}
					}
					return true;
				};
			}

			if (!this.paging) {
				this.fnResize = function () {meta.recalcSize(true);};
				zk.addOnResize(this.fnResize);
			}

			this.form = zk.formOf(this.element);
			if (this.form) {
				this.fnSubmit = function () {
					meta.onsubmit();
				};
				zk.listen(this.form, "submit", this.fnSubmit);
			}
		}

		if (!this.paging) {
			//FF: a small fragment is shown
			//IE: Bug 1775014
			if (this.headtbl && this.headtbl.rows.length) {
				var empty = true;
				l_out:
				for (var j = this.headtbl.rows.length; j;) {
					var headrow = this.headtbl.rows[--j];
					for (var k = headrow.cells.length; k;) {
						var n = headrow.cells[--k].firstChild; // Bug #1819037
						for (n = n ? n.firstChild: n; n; n = n.nextSibling)
							if (!n.id || !n.id.endsWith("!hint")) {
								empty = false;
								break l_out;
							}
					}
				}
				if (empty) this.head.style.height = "0px"; // Bug #1819037
					//we have to hide if empty (otherwise, a small block is shown)					
				else this.head.style.height = "";// Bug #1832359
			}

			this.body.onscroll = function () {
				if (meta.head) meta.head.scrollLeft = meta.body.scrollLeft;
				if (meta.foot) meta.foot.scrollLeft = meta.body.scrollLeft;
				meta._render(zk.gecko ? 200: 60);
					//Moz has a bug to send the request out if we don't wait long enough
					//How long is enough is unknown, but 200 seems fine
			};
		}
		
		if (isLater && this.qcells.length
		&& this.headtbl && this.headtbl.rows.length
		&& this.bodytbl && this.bodytbl.rows.length > 1) { //recalc is only a few lines
			zk.cpCellArrayWidth(this.headtbl.rows[0], this.qcells);
		} else {
			setTimeout("zkSel._calcSize('"+this.id+"')", 150); // Bug #1813722
		}
		this.qcells.length = 0;
		this._render(155); //prolong a bit since calSize might not be ready
	},
	putCellQue: function (cell) {
/** no need to check replication, since the server generates one for each
		for (var j = this.qcells.length; j;)
			if (this.qcells[--j] == cell)
				return; //replicate
*/
		this.qcells.push(cell);
	},
	cleanup: function ()  {
		if (this.fnResize)
			zk.rmOnResize(this.fnResize);
		if (this.fnSubmit)
			zk.unlisten(this.form, "submit", this.fnSubmit);
		this.element = this.body = this.head = this.bodytbl = this.headtbl
			this.foot = this.foottbl = this.fnSubmit = this.qcells = this._focus = null;
			//in case: GC not works properly
	},
	/** Stripes the rows. */
	stripe: function () {
		var scOdd = getZKAttr(this.element, "scOddRow");
		if (!scOdd || !this.bodyrows) return;
		for (var j = 0, even = true, bl = this.bodyrows.length; j < bl; ++j) {
			var row = this.bodyrows[j];
			if ($visible(row)) {
				zk.addClass(row, scOdd, !even);
				even = !even;
			}
		}
	},

	/** Handles keydown sent to the body. */
	dobodykeydown: function (evt, target) {
		if (zkSel._shallIgnoreEvent(target))
			return true;

	// Note: We don't intercept body's onfocus to gain focus back to anchor.
	// Otherwise, it cause scroll problem on IE:
	// When user clicks on the scrollbar, it scrolls first and call onfocus,
	// then it will scroll back to the focus because _focusToAnc is called
		switch (Event.keyCode(evt)) {
		case 33: //PgUp
		case 34: //PgDn
		case 38: //UP
		case 40: //DOWN
		case 37: //LEFT
		case 39: //RIGHT
		case 32: //SPACE
		case 36: //Home
		case 35: //End
			if ($tag(target) != "A")
				this._refocus();
			Event.stop(evt);
			return false;
		}
		return true;
	},
	/** Handles the keydown sent to the row. */
	dokeydown: function (evt, target) {
		if (zkSel._shallIgnoreEvent(target))
			return true;

		var row = $tag(target) == "TR" ? target: zk.parentNode(target, "TR");
		if (!row) return true;

		var shift = evt.shiftKey, ctrl = evt.ctrlKey;
		if (shift && !this._isMultiple())
			shift = false; //OK to 

		var endless = false, step, lastrow;
		switch (Event.keyCode(evt)) {
		case 33: //PgUp
		case 34: //PgDn
			step = this.realsize();
			if (step == 0) step = 20;
			if (Event.keyCode(evt) == 33)
				step = -step;
			break;
		case 38: //UP
		case 40: //DOWN
			step = Event.keyCode(evt) == 40 ? 1: -1;
			break;
		case 32: //SPACE
			if (this._isMultiple()) this.toggleSelect(row, !this._isSelected(row));
			else this.select(row);
			break;
		case 36: //Home
		case 35: //End
			step = Event.keyCode(evt) == 35 ? 1: -1;
			endless = true;
			break;
		case 37: //LEFT
			this._doLeft(row);
			break;
		case 39: //RIGHT
			this._doRight(row);
			break;
		}

		if (step) {
			if (shift) this.toggleSelect(row, true);
			for (; (row = step > 0 ? row.nextSibling: row.previousSibling) != null;) {
				if ($tag(row) == "TR"  && this._isValid(row) && getZKAttr(row, "disd") != "true") {
					if (shift) this.toggleSelect(row, true);

					if ($visible(row)) {
						if (!shift) lastrow = row;
						if (!endless) {
							if (step > 0) --step;
							else ++step;
							if (step == 0) break;
						}
					}
				}
			}
		}
		if (lastrow) {
			if (ctrl) this.focus(lastrow);
			else this.select(lastrow);
			zk.scrollIntoView(this.body, lastrow); // Bug #1823947 and #1823278
		}

		switch (Event.keyCode(evt)) {
		case 33: //PgUp
		case 34: //PgDn
		case 38: //UP
		case 40: //DOWN
		case 37: //LEFT
		case 39: //RIGHT
		case 32: //SPACE
		case 36: //Home
		case 35: //End
			Event.stop(evt);
			return false;
		}
		return true;
	},
	/** Do when the left key is pressed. */
	_doLeft: function (row) {
	},
	/** Do when the right key is pressed. */
	_doRight: function (row) {
	},
	/** Returns the type of the row. */
	_rowType: function () {
		return "Lit";
	},
	doclick: function (evt, target) {
		if (zkSel._shallIgnoreEvent(target))
			return;
		var tn = $tag(target);
		if((tn != "TR" && target.onclick)
		|| (tn == "A" && !target.id.endsWith("!sel"))
		|| getZKAttr(target, "lfclk") || getZKAttr(target, "dbclk"))
			return;

		var checkmark = target.id && target.id.endsWith("!cm");
		var row = tn == "TR" ? target: zk.parentNode(target, "TR");
		if (!row || $type(row) != this._rowType())
			return; //incomplete structure or grid in listbox...

		//It is better not to change selection only if dragging selected
		//(like Windows does)
		//However, FF won't fire onclick if dragging, so the spec is
		//not to change selection if dragging (selected or not)
		if (zk.dragging /*&& this._isSelected(row)*/)
			return;
		if (checkmark) {
			if (this._isMultiple()) {
				this.toggleSelect(row, target.checked);
			} else {
				this.select(row);
			}
		} else {
		//Bug 1650540: double click as select again
		//Note: we don't handle if clicking on checkmark, since FF always
		//toggle and it causes incosistency
			if ((zk.gecko || zk.safari) && getZKAttr(row, "dbclk")) {
				var now = $now(), last = row._last;
				row._last = now;
				if (last && now - last < 900)
					return; //ignore double-click
			}

			if (this._isMultiple()) {
				if (evt && evt.shiftKey) {
					this.selectUpto(row);
				} else if (evt && evt.ctrlKey) {
					this.toggleSelect(row, !this._isSelected(row));
				} else {
	//Note: onclick means toggle if checkmark is enabled
	//Otherwise, we mimic Windows if checkmark is disabled
					var el = $e(row.id + "!cm");
					if (el) this.toggleSelect(row, !el.checked);
					else this.select(row);
				}
			} else {
				this.select(row);
			}

			//since row might was selected, we always enfoce focus here
			this._focusToAnc(row);
			//if (evt) Event.stop(evt);
			//No much reason to eat the event.
			//Oppositely, it disabled popup (bug 1578659)
		}
	},

	/** Returns # of rows allowed. */
	size: function () {
		var sz = getZKAttr(this.element, "size");
		return sz ? $int(sz): 0;
	},
	/** Returns the real # of rows (aka., real size). */
	realsize: function (v) {
		if ("number" == typeof v) {
			this.element.setAttribute("zk_realsize", v);
		} else {
			var sz = this.size();
			if (sz) return sz;
			sz = this.element.getAttribute("zk_realsize");
			return sz ? $int(sz): 0;
		}
	},

	/** Re-setfocus to the anchor who shall be in focus. */
	_refocus: function () {
		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (this._isFocus(r)) this._focusToAnc(r);
		}
	},
	/** Process the setAttr command sent from the server. */
	setAttr: function (nm, val) {
		switch (nm) {
		case "z.innerWidth":
			if (this.headtbl) this.headtbl.style.width = val;
			if (this.bodytbl) this.headtbl.style.width = val;
			if (this.foottbl) this.headtbl.style.width = val;
			return true;
		case "select": //select by uuid
			var row = $e(val);
			this._selectOne(row, false);
			zk.scrollIntoView(this.body, row);
			return true;
		case "selectAll":
			this._selectAll();
			return true; //no more processing
		case "z.multiple": //whether to support multiple
			this._setMultiple("true" == val);
			return true;
		case "chgSel": //val: a list of uuid to select
			var sels = {};
			for (var j = 0;;) {
				var k = val.indexOf(',', j);
				var s = (k >= 0 ? val.substring(j, k): val.substring(j)).trim();
				if (s) sels[s] = true;
				if (k < 0) break;
				j = k + 1;
			}

			var rows = this.bodyrows;
			for (var j = 0, rl = rows.length; j < rl; ++j)
				this._changeSelect(rows[j], sels[rows[j].id] == true);
			return true;
		case "z.vflex":
		if (val == "true") {
			if (zk.ie) this.element.style.overflow = "hidden"; 
			// added by Jumper for IE to get a correct offsetHeight so we need 
			// to add this command faster than the this._calcSize() function.
			var hgh = this.element.style.height;
			if (!hgh || hgh == "auto") this.element.style.height = "99%"; // avoid border 1px;
		} else {
			if (zk.ie) this.element.style.overflow = ""; // cleanup style 
		}
		case "z.size":
			zkau.setAttr(this.element, nm, val);
			this.recalcSize(true);
			return true;
		case "style":
		case "style.width":
		case "style.height":
			if (!this.paging) {
				zkau.setAttr(this.element, nm, val);
				this.init();
				return true;
			}
			break;
		case "scrollTop":
			if (!this.paging && this.body) {
				this.body.scrollTop = val;
				return true;
			}
			break;
		case "scrollLeft":
			if (!this.paging && this.body) {
				this.body.scrollLeft = val;
				return true;
			}
			break;
		case "z.scOddRow":
			zkau.setAttr(this.element, nm, val);
			this.stripe();
			return true;
		case "z.render":
			this._render(0);
			return true;
		}
		return false;
	},
	/** Returns the item's UUID containing the specified row. */
	getItemUuid: function (row) {
		return row.id;
	},
	/** Selects an item, notify server and change focus if necessary. */
	select: function (row) {
		if (this._selectOne(row, true)) {
			//notify server
			zkau.send({
				uuid: this.id, cmd: "onSelect", data: [this.getItemUuid(row), this.getItemUuid(row)]},
				zkau.asapTimeout(this.element, "onSelect"));
		}
	},
	/** Toggle the selection and notifies server. */
	toggleSelect: function (row, toSel) {
		this._changeSelect(row, toSel);
		this.focus(row);

		//maintain z.selId
		var selId = this._getSelectedId();
		if (this._isMultiple()) {
			if (row.id == selId)
				this._fixSelelectedId();
		} else if (selId) {
			var sel = $e(selId);
			if (sel) this._changeSelect(sel, false);
		}

		//notify server
		this._sendSelect(row);
	},
	/** Selects a range from the last focus up to the specified one.
	 * Callable only if multiple
	 */
	selectUpto: function (row) {
		if (this._isSelected(row)) {
			this.focus(row);
			return; //nothing changed
		}

		var focusfound = false, rowfound = false;
		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (focusfound) {
				this._changeSelect(r, true);
				if (r == row)
					break;
			} else if (rowfound) {
				this._changeSelect(r, true);
				if (this._isFocus(r))
					break;
			} else {
				rowfound = r == row;
				focusfound = this._isFocus(r);
				if (rowfound || focusfound) {
					this._changeSelect(r, true);
					if (rowfound && focusfound)
						break;
				}
			}
		}

		this.focus(row);
		this._fixSelelectedId();
		this._sendSelect(row);
	},

	/** Changes the specified row as focused. */
	focus: function (row) {
		this._unsetFocusExcept(row);
		this._setFocus(row, true);
	},
	/** Sets focus to the specified row if it has the anchor. */
	_focusToAnc: function (row) {
		if (!row) return;

		var uuid = typeof row == 'string' ? row: row.id;
		var el = $e(uuid + "!cm");
		if (!el) el = $e(uuid + "!sel");
		if (el && el.tabIndex != -1) //disabled due to modal, see zk.disableAll
			zk.asyncFocus(el.id);
	},

	/** Selects one and deselect others, and return whehter any changes.
	 * It won't notify the server.
	 * @param row the row to select. Unselect all if null
	 * @param toFocus whether to change focus
	 */
	_selectOne: function (row, toFocus) {
		row = $e(row);
		
		var selId = this._getSelectedId();

		if (this._isMultiple()) {
			if (row && toFocus) this._unsetFocusExcept(row);
			var changed = this._unsetSelectAllExcept(row);
			if (!changed && row && selId == row.id) {
				if (toFocus) this._setFocus(row, true);
				return false; //not changed
			}
		} else {
			if (selId) {
				if (row && selId == row.id) {
					if (toFocus) this._setFocus(row, true);
					return false; //not changed
				}

				var sel = $e(selId);
				if (sel) {
					this._changeSelect(sel, false);
					if (row)
						if(toFocus) this._setFocus(sel, false);
						else this._fixAnc(sel, false); //Bug 1505786 (called by setAttr with "selected")
				}
			} else {
				if (row && toFocus) this._unsetFocusExcept(row);
			}
		}
		//we always invoke _changeSelect to change focus
		if (row) {
			this._changeSelect(row, true);
			if (toFocus) this._setFocus(row, true);
			else this._fixAnc(row, true); //Bug 1505786
			this._setSelectedId(row.id);
		} else {
			this._setSelectedId(null);
		}
		return true;
	},

	/** Changes the selected status of an item without affecting other items
	 * and return true if the status is really changed.
	 */
	_changeSelect: function (row, toSel) {
		if (!this._isValid(row)) return false;

		var changed = this._isSelected(row) != toSel;
		if (changed) {
			var el = $e(row.id + "!cm");
			if (toSel) {
				if (el) el.checked = true;
				zk.addClass(row, "seld");
				zkSel.onoutTo(row);
				setZKAttr(row, "sel", "true");
			} else {
				if (el) el.checked = false;
				zk.rmClass(row, "seld");
				zkSel.onoutTo(row);
				setZKAttr(row, "sel", "false");
			}
		}
		return changed;
	},
	/** Changes the focus status, and return whether it is changed. */
	_setFocus: function (row, toFocus) {
		if (!this._isValid(row)) return false;
		this._focus = row;
		var changed = this._isFocus(row) != toFocus;
		if (changed) {
			this._fixAnc(row, toFocus);
			if (toFocus) {
				var el = $e(row.id + "!cm");
				if (!el) el = $e(row.id + "!sel");
				if (el && el.tabIndex != -1) //disabled due to modal, see zk.disableAll
					zk.asyncFocus(el.id);
				zkSel.cmonfocusTo(row);

				if (!this.paging && zk.gecko) this._render(5);
					//Firefox doesn't call onscroll when we moving by cursor, so...
			} else {
				zkSel.cmonblurTo(row);
			}
		}
		return changed;
	},
	_fixAnc: function (row, toAnc) {
		var el = $e(row.id + "!sel");
		if (toAnc) {
			if (!el && !$e(row.id + "!cm") && row.cells.length > 0) {
				el = document.createElement("A");
				el.href = "javascript:;";
				el.id = row.id + "!sel";
				el.innerHTML = " ";
				el.onfocus = zkSel.cmonfocus;
				el.onblur = zkSel.cmonblur;
				var cave = row.cells[0].firstChild || row.cells[0];
				if (cave.firstChild) cave.insertBefore(el, cave.firstChild); 
				else cave.appendChild(el);
			}
		} else {
			zk.remove(el);
		}
	},
	/** Cleans selected except the specified one, and returns any selected status
	 * is changed.
	 */
	_unsetSelectAllExcept: function (row) {
		var changed = false;
		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (r != row && this._changeSelect(r, false))
				changed = true;
		}
		return changed;
	},
	/** Cleans selected except the specified one, and returns any selected status
	 * is changed.
	 */
	_unsetFocusExcept: function (row) {
		return this._focus && this._focus != row ? this._setFocus(this._focus, false) : false;
	},

	/** Renders listitems that become visible by scrolling.
	 */
	_render: function (timeout) {
		setTimeout("zkSel._renderNow('"+this.id+"')", timeout);
	},
	_renderNow: function () {
		var rows = this.bodyrows;
		if (!rows || !rows.length || getZKAttr(this.element, "model") != "true") return;

		//Note: we have to calculate from top to bottom because each row's
		//height might diff (due to different content)
		var data = "";
		var min = this.body.scrollTop, max = min + this.body.offsetHeight;
		for (var j = 0, rl = rows.length; j < rl; ++j) {
			var r = rows[j];
			if ($visible(r)) {
				var top = zk.offsetTop(r);
				if (top + zk.offsetHeight(r) < min) continue;
				if (top > max) break; //Bug 1822517: max might be 0
				if (getZKAttr(r, "loaded") != "true")
					data += "," + this.getItemUuid(r);
				else if (getZKAttr(r, "inited") != "true") zk.initAt(r);
			}
		}
		if (data) {
			data = data.substring(1);
			zkau.send({uuid: this.id, cmd: "onRender", data: [data]}, 0);
		}
	},

	/** Calculates the size. */
	_calcSize: function () {		
		this._calcHgh();	
		if (this.paging) {// Bug #1826101
			if (this.bodytbl && this.bodytbl.rows.length) {
				var head;
				for (var j = 0, rl = this.bodytbl.rows.length; j < rl; j++) {
					if ($type(this.bodytbl.rows[j]) == "Lhrs") {
						head = this.bodytbl.rows[j];
						break;
					}
				}
				if (head) {
					for (var j = 0, hl = head.cells.length; j < hl; j++) {
						var d = head.cells[j], cave = d.firstChild;
						if (!zk.isVisible(d)) { //Bug #1867370
							for (var k = this.bodyrows.length; --k >=0;)
								if (this.bodyrows[k].cells[j] != d) 
									this.bodyrows[k].cells[j].style.display = "none";
							continue;
						}
						if (cave) {
							var wd =  d.style.width;							
							if (!wd || wd == "auto" || wd.indexOf('%') > -1) 
								d.style.width = zk.revisedSize(d, d.offsetWidth) + "px";								
							var w = $int(d.style.width);
							cave.style.width = zk.revisedSize(cave, w) + "px";
						}
					}
				}
			}
			return; //nothing to adjust since single table
		}

		
		//Bug 1553937: wrong sibling location
		//Otherwise,
		//IE: element's width will be extended to fit body
		//FF and IE: sometime a horizontal scrollbar appear (though it shalln't)
		//
		//Bug 1616056: we have to use style.width, if possible, since clientWidth
		//is sometime too big
		var wd = this.element.style.width;
		if (!wd || wd == "auto" || wd.indexOf('%') >= 0) {
			wd = zk.revisedSize(this.element, this.element.offsetWidth) - (wd == "100%" ? 2 : 0);
			if (wd < 0) wd = 0;
			if (wd) wd += "px";
		}
		if (wd) {
			this.body.style.width = wd;
			if (this.head) this.head.style.width = wd;
			if (this.foot) this.foot.style.width = wd;
		}

		var tblwd = this.body.clientWidth;
		if (zk.ie) //By experimental: see zk-blog.txt
			if (tblwd && this.body.offsetWidth - tblwd > 11) {
				if (--tblwd < 0) tblwd = 0;
				this.bodytbl.style.width = tblwd + "px";
			} else
				this.bodytbl.style.width = "";		
		if (this.headtbl) {
			if (tblwd) this.head.style.width = tblwd + 'px';
			if (this.headtbl.rows.length) {
				var head, rows = this.headtbl.rows;
				for(var j = 0, l = rows.length; j < l; j++) {
					var type = $type(rows[j]);
					if (type == "Lhrs" || type == "Tcols") {
						head = rows[j];
						break;
					}
				}
				var fake = $e(head.id + "!fake"), recalc = true;
				if (!fake && !head.rowIndex) {
					zk.cpCellWidth(head, this.bodyrows, this);
					recalc = false;
				}
				if (!fake || fake.cells.length != head.cells.length) {
					if (fake) fake.parentNode.removeChild(fake);
					var src = document.createElement("TR");
					src.id = head.id + "!fake";
					src.style.height = "0px";
						//Note: we cannot use display="none" (offsetWidth won't be right)
					for (var j = head.cells.length; --j >= 0;)
						src.appendChild(document.createElement("TD"));					
					rows[0].parentNode.insertBefore(src, rows[0]);						
				}
				var row = rows[0], cells = row.cells, k = 0, l = cells.length;
				
				for (; k < l; k++) {
					var s = cells[k], d = head.cells[k], wd = d.style.width;							
					if (!wd || wd == "auto" || wd.indexOf('%') > -1) // Bug #1822564
						d.style.width = zk.revisedSize(d, d.offsetWidth) + "px";
					
					wd = d.style.width;
					if (zk.isVisible(d))
						s.style.width = $int(wd) + zk.sumStyles(d, "lr", zk.borders) + zk.sumStyles(d, "lr", zk.paddings) + "px";
					else s.style.display = "none";
				}
				if (recalc) zk.cpCellWidth(head, this.bodyrows, this); // But #1886788 recalculate width.
			}
			if (this.foottbl && this.foottbl.rows.length)
				zk.cpCellWidth(this.headtbl.rows[0], this.foottbl.rows, this);
		} else if (this.foottbl) {
			if (tblwd) this.foot.style.width = tblwd + 'px';
			if (this.foottbl.rows.length)
				zk.cpCellWidth(this.foottbl.rows[0], this.bodyrows, this); //assign foot's col width
		}
	},
	/** Returns the visible row at the specified index. */
	_visiRowAt: function (index) {
		if (index >= 0) {
			var rows = this.bodyrows;
			for (var j = 0, rl = rows.length; j < rl; ++j) {
				var r = rows[j];
				if ($visible(r) && --index < 0)
					return r;
			}
		}
		return null;
	},
	_calcHgh: function () {
		var rows = this.bodyrows;		
		var hgh = this.element.style.height, isHgh = hgh && hgh != "auto" && hgh.indexOf('%') < 0;
		if (isHgh) {
			hgh = $int(hgh);
			if (hgh) {
				hgh -= this._headHgh(0);
				if (hgh < 20) hgh = 20;
				var sz = 0;
				l_out:
				for (var h, j = 0, rl = rows.length; j < rl; ++sz, ++j) {
					//next visible row
					var r;
					for (;; ++j) {//no need to check length again
						if (j >= rl) break l_out;
						r = rows[j];
						if ($visible(r)) break;
					}

					h = zk.offsetTop(r) + zk.offsetHeight(r);
					if (h >= hgh) {
						if (h > hgh + 2) ++sz; //experimental
						break;
					}
				}
				sz = Math.ceil(sz && h ? (hgh * sz)/h: hgh/this._headHgh(20));

				this.realsize(sz);
				this.body.style.height = hgh + "px";
				
				//2007/12/20 We don't need to invoke the body.offsetHeight to avoid a performance issue for FF. 
				if (zk.ie && this.body.offsetHeight) {} // bug #1812001.
				// note: we have to invoke the body.offestHeight to resolve the scrollbar disappearing in IE6 
				// and IE7 at initializing phase.
				return; //done
			}
		}

		var nVisiRows = 0, nRows = this.size(), lastVisiRow, firstVisiRow, midVisiRow;
		for (var j = 0, rl = rows.length; j < rl; ++j) { //tree might collapse some items
			var r = rows[j];
			if ($visible(r)) {
				++nVisiRows;
				if (!firstVisiRow) firstVisiRow = r;

				if (nRows === nVisiRows) {
					midVisiRow = r;
					break;
					//nVisiRows and lastVisiRow useful only if nRows is larger,
					//so ok to break here
				}
				lastVisiRow = r;
			}
		}

		hgh = 0;
		var diff = 2/*experiment*/;
		if (!nRows) {
			if (getZKAttr(this.element, "vflex") == "true") {
				hgh = this._vflexSize();
				
				if (zk.ie && $int(getZKAttr(this.element, "hgh")) != hgh) {
					hgh -= 1; // need to display the bottom border.
					setZKAttr(this.element, "hgh", hgh);
				}
				if (hgh < 25) hgh = 25;

				var rowhgh = zk.offsetHeight(firstVisiRow);
				if (!rowhgh) rowhgh = this._headHgh(20);

				nRows = Math.round((hgh - diff)/ rowhgh);
				if (nRows < 3) { //minimal 3 rows if auto-size
					nRows = 3;
					hgh = rowhgh * 3 + diff;
				}
			}
			this.realsize(nRows);
		}

		if (nRows) {
			if (!hgh) {
				if (!nVisiRows) hgh = this._headHgh(20) * nRows;
				else if (nRows <= nVisiRows) {
					//var r = this._visiRowAt(nRows - 1); disabled by Jumper
					hgh = zk.offsetTop(midVisiRow) + zk.offsetHeight(midVisiRow);
				} else {
					hgh = zk.offsetTop(lastVisiRow) + zk.offsetHeight(lastVisiRow);
					hgh = Math.ceil((nRows * hgh) / nVisiRows);
				}
				if (zk.ie) hgh += diff; //strange in IE (or scrollbar shown)
			}

			this.body.style.height = hgh + "px";
			
			//2007/12/20 We don't need to invoke the body.offsetHeight to avoid a performance issue for FF. 
			if (zk.ie && this.body.offsetHeight) {} // bug #1812001.
			// note: we have to invoke the body.offestHeight to resolve the scrollbar disappearing in IE6 
			// and IE7 at initializing phase.
		} else {
			//if no hgh but with horz scrollbar, IE will show vertical scrollbar, too
			//To fix the bug, we extend the height
			hgh = this.element.style.height;
			if (zk.ie && (!hgh || hgh == "auto")
			&& this.body.offsetWidth - this.body.clientWidth > 11) {
				if (!nVisiRows) this.body.style.height = ""; // bug #1806152 if start with 0px and no hgh, IE doesn't calculate the height of the element.
				else this.body.style.height =
						(this.body.offsetHeight * 2 - this.body.clientHeight) + "px";
			} else {
				this.body.style.height = "";
			}
		}
	},
	/* Height of the head row. If now header, defval is returned. */
	_headHgh: function (defVal) {
		var n = this.headtbl;
		n = n && n.rows.length ? n.rows[0]: null;
		var hgh = n ? zk.offsetHeight($real(n)): 0; // Bug #1823218 
		return hgh ? hgh: defVal;
	},
	/** Returns the size for vflex
	 */
	_vflexSize: function () {
		return this.element.offsetHeight - 2 - (this.head ? this.head.offsetHeight : 0)
			- (this.foot ? this.foot.offsetHeight : 0); // Bug #1815882
	},

	/** Recalculate the size. */
	recalcSize: function (cleansz) {
		if (!zk.isRealVisible(this.element)) return;
		setTimeout("zkSel._calcSize('"+this.id+"')", 50);
	},
	/** Resize the specified column. */
	resizeCol: function (cmp, icol, col, wd, keys) {
		if (this.bodyrows)
			zulHdr.resizeAll(this, cmp, icol, col, wd, keys);
	},

	/** Sels all items (don't notify server and change focus, because it is from server). */
	_selectAll: function (notify) {
		var rows = this.bodyrows;
		for (var j = 0, rl = rows.length; j < rl; ++j)
			this._changeSelect(rows[j], true);

		this._setSelectedId(rows.length ? rows[0].id: null);
		if (notify) this._sendSelect(rows[0]);
	},

	/** Notifies the server the selection is changed (callable only if multiple). */
	_sendSelect: function (row) {
		//To reduce # of bytes to send, we use a string instead of array.
		var data = "";
		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (this._isSelected(r))
				data += "," + this.getItemUuid(r);
		}
		if (data) data = data.substring(1);
		zkau.send({uuid: this.id, cmd: "onSelect", data: [data, row ? this.getItemUuid(row) : ""]},
				zkau.asapTimeout(this.element, "onSelect"));
	},

	/** Returns z.selId (aka., the id of the selected item), or null if
	 * no one is ever selected.
	 */
	_getSelectedId: function () {
		var selId = getZKAttr(this.element, "selId");
		if (!selId) {
			alert(mesg.INVALID_STRUCTURE + "z.selId not found");
			return null;
		}
		return selId == "zk_n_a" ? null: selId;
	},
	/** Sets z.selId (aka., the id of the selected item). */
	_setSelectedId: function (selId) {
		setZKAttr(this.element, "selId", selId ? selId: "zk_n_a");
	},
	/** Fixes z.selId to the first selected item. */
	_fixSelelectedId: function () {
		var selId = null;
		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (this._isSelected(r)) {
				selId = r.id;
				break;
			}
		}
		this._setSelectedId(selId);
	},

	/** Whether an item is selected. */
	_isSelected: function (row) {
		return getZKAttr(row, "sel") == "true";
	},
	/** Whether an item has focus. */
	_isFocus: function (row) {
		return $e(row.id + "!sel") || $e(row.id + "!cm");
	},
	/** Whether the component is multiple.
	 */
	_isMultiple: function () {
		return getZKAttr(this.element, "multiple") == "true";
	},
	/** Changes the multiple status. Note: it won't notify the server any change
	 */
	_setMultiple: function (multiple) {
		setZKAttr(this.element, "multiple", multiple ? "true": "false");
		if (!multiple) {
			var row = $e(this._getSelectedId());
			this._unsetSelectAllExcept(row);
				//no need to unfocus because we don't want to change focus
		}
	},
	/** Returns whether the row is valid. */
	_isValid: function (row) {
		return row && !row.id.endsWith("!child") && !row.id.endsWith("!ph") && !row.id.endsWith("!pt");
	},

	/** Called when the form enclosing it is submitting. */
	onsubmit: function () {
		var nm = getZKAttr(this.element, "name");
		if (!nm || !this.form) return;

		for (var j = 0, fl = this.form.elements.length; j < fl; ++j){
			var el = this.form.elements[j];
			if (getZKAttr(el, "hiddenBy") == this.id) {
				zk.remove(el);
				--j;
			}
		}

		for (var j = 0, bl = this.bodyrows.length; j < bl; ++j) {
			var r = this.bodyrows[j];
			if (this._isSelected(r))
				setZKAttr(
					zk.newHidden(nm, getZKAttr(r, "value"), this.form),
					"hiddenBy", this.id);
		}
	}
};

////
// Utilities to help implement zk.Selectable //
zkSel = {};

zkSel._init = function (uuid) {
	var meta = zkau.getMeta(uuid);
	if (meta) meta._init();
};
zkSel._calcSize = function (uuid) {
	var meta = zkau.getMeta(uuid);
	if (meta) meta._calcSize();
};
zkSel._renderNow = function (uuid) {
	var meta = zkau.getMeta(uuid);
	if (meta) meta._renderNow();
};
zkSel._shallIgnoreEvent = function (el) {
	var tn = $tag(el);
	return !el || ((tn == "INPUT" && !el.id.endsWith("!cm"))
	|| tn == "TEXTAREA" || tn == "BUTTON" || tn == "SELECT" || tn == "OPTION");
};

/** row's onmouseover. */
zkSel.onover = function (evt) {
	if (!zk.dragging) {
		if (!evt) evt = window.event;
		var row = $parentByTag(Event.element(evt), "TR");
		if (row) Selectable_effect(row);
	}
};
/** row's onmouseout. */
zkSel.onout = function (evt) {
	if (!zk.dragging) {
		if (!evt) evt = window.event;
		zkSel.onoutTo($parentByTag(Event.element(evt), "TR"));
	}
};
zkSel.onoutTo = function (row) {
	if (row) Selectable_effect(row, true);
};
zkSel.ondragover = function (evt) {
	var target = Event.element(evt);
	var tag = $tag(target);
	if (tag != "INPUT" && tag != "TEXTAREA") {
		var p = $parentByType(target, "Lic");
		if (p) p.firstChild.style.MozUserSelect = "none";
	}
};
zkSel.ondragout = function (evt) {
	var target = Event.element(evt);
	var p = $parentByType(target, "Lic");
	if (p) p.firstChild.style.MozUserSelect = "";	
};
/** (!cm or !sel)'s onfocus. */
zkSel.cmonfocus = function (evt) {
	if (!evt) evt = window.event;
	zkSel.cmonfocusTo($parentByTag(Event.element(evt), "TR"));
};
/** (!cm or !sel)'s onblur. */
zkSel.cmonblur = function (evt) {
	if (!evt) evt = window.event;
	zkSel.cmonblurTo($parentByTag(Event.element(evt), "TR"));
};
zkSel.cmonfocusTo = function (row) {
	if (row) zk.addClass(row, "focusd");
};
zkSel.cmonblurTo = function (row) {
	if (row) zk.rmClass(row, "focusd");
};

////
// listbox //
zkLibox = {}; //listbox

/** Called when the body got a key stroke. */
zkLibox.bodyonkeydown = function (evt) {
	if (!evt) evt = window.event;
	var target = Event.element(evt);
	var meta = zkau.getMetaByType(target, "Libox");
	return !meta || meta.dobodykeydown(evt, target);
};
/** Called when a listitem got a key stroke. */
zkLibox.onkeydown = function (evt) {
	if (!evt) evt = window.event;
	var target = Event.element(evt);
	var meta = zkau.getMetaByType(target, "Libox");
	return !meta || meta.dokeydown(evt, target);
};
/** Called when mouse click. */
zkLibox.onclick = function (evt) {
	if (!evt) evt = window.event;
	var target = Event.element(evt);
	var meta = zkau.getMetaByType(target, "Libox");
	if (meta) meta.doclick(evt, target);
};

/** Called when focus command is received. */
zkLibox.focus = function (cmp) {
	var meta = zkau.getMeta(cmp);
	if (meta) meta._refocus();
	return true;
};
/** Process the setAttr cmd sent from the server, and returns whether to
 * continue the processing of this cmd
 */
zkLibox.setAttr = function (cmp, nm, val) {
	var meta = zkau.getMeta(cmp);
	return meta && meta.setAttr(nm, val);
};

/** Init (and re-init) a listbox. */
zkLibox.init = function (cmp) {
	var meta = zkau.getMeta(cmp);
	if (meta) meta.init();
	else {
		meta = new zk.Selectable(cmp);
		if (meta.body)
			zk.listen(meta.body, "keydown", zkLibox.bodyonkeydown);
	}
};
/** Called when a listbox becomes visible because of its parent. */
zkLibox.onVisi = function (cmp) {
	var meta = zkau.getMeta(cmp);
	if (meta) meta.init();
};

zkLit = {}; //listitem
zkLit.init = function (cmp) {
	setZKAttr(cmp, "inited", "true");
	//zk.disableSelection(cmp);
	//Tom Yeh: 20060106: side effect: unable to select textbox if turned on
	if (getZKAttr(cmp, "disd") != "true") {
		zk.listen(cmp, "click", zkLibox.onclick);
		zk.listen(cmp, "mouseover", zkSel.onover);
		zk.listen(cmp, "mouseout", zkSel.onout);
	}	
	zk.listen(cmp, "keydown", zkLibox.onkeydown);
	zkLit.stripe(cmp);
};
zkLit.setAttr = function (cmp, nm, val) {
	if (nm == "visibility") {// Bug #1836257
		var meta = zkau.getMeta(getZKAttr(cmp, "rid"));
		if (meta) {
			if (!meta.fixedStripe) meta.fixedStripe = function () {meta.stripe();};
			setTimeout(meta.fixedStripe, 0);
		}
	}
	return false;
};
zkLit.initdrag = function (cmp) {
	if (zk.gecko) {
		zk.listen(cmp, "mouseover", zkSel.ondragover);
		zk.listen(cmp, "mouseout",  zkSel.ondragout);	
	}
};
zkLit.cleandrag = function (cmp) {
	if (zk.gecko) {
		zk.unlisten(cmp, "mouseover", zkSel.ondragover);
		zk.unlisten(cmp, "mouseout",  zkSel.ondragout);	
	}
};
zkLit.cleanup = function (cmp) {
	zkLit.stripe(cmp, true);
};
zkLit.stripe = function (cmp, isClean) {
	var meta = zkau.getMeta(getZKAttr(cmp, "rid"));
	if (meta) {
		if (!meta.fixedStripe) meta.fixedStripe = function () {meta.stripe();};
		if (isClean) zk.addCleanupLater(meta.fixedStripe, false, "Lit");
		else zk.addInitLater(meta.fixedStripe, false, meta.id + "Lit");
	}
};
zkLic = {}; //listcell or Treecell
zkLic.init = function (cmp) {
	var meta = zkau.getMeta(getZKAttr(cmp.parentNode, "rid"));	
	if (meta) {
		meta.putCellQue(cmp);
		if (!meta.fixedSize)
			meta.fixedSize = function () {meta.init(true);};	
		zk.addInitLater(meta.fixedSize, false, meta.id + "Lic");
	}
};
zkLic.initdrag = zkLit.initdrag;
zkLic.cleandrag = zkLit.cleandrag;
zkLic.setAttr = function (cmp, nm, val) {
	if ("style" == nm) {
		var cell = cmp.firstChild;
		var v = zk.getTextStyle(val);
		if (v) zkau.setAttr(cell, nm, v);
		zkau.setAttr(cmp, nm, val);
		return true;
	}
	return false;
};
/** Called when _onDocCtxMnu is called. */
zkLit.onrtclk = function (cmp) {
	var meta = zkau.getMetaByType(cmp, "Libox");
	if (meta && !meta._isSelected(cmp)) meta.doclick(null, cmp);
};

zkLcfc = {}; //checkmark or the first hyperlink of listcell
zkLcfc.init = function (cmp) {
	zk.listen(cmp, "focus", zkSel.cmonfocus);
	zk.listen(cmp, "blur", zkSel.cmonblur);
};
zkLhfc = {}; //checkmark for listheader
zkLhfc.init = function (cmp) {
	zk.listen(cmp, "click", zkLhfc.onclick);
};
zkLhfc.onclick = function (evt) {
	var cmp = zkau.evtel(evt);	
	var meta = zkau.getMetaByType(cmp, "Libox");
	if (meta)
		cmp.checked ? meta._selectAll(true) : meta.select("");
};
zk.addModuleInit(function () {
	//Listheader
	//init it later because zul.js might not be loaded yet
	zkLhr = {}
	Object.extend(zkLhr, zulHdr);

	/** Resize the column. */
	zkLhr.resize = function (col1, icol, wd1, keys) {
		var box = $parentByType(col1, "Libox");
		if (box) {
			var meta = zkau.getMeta(box);
			if (meta)
				meta.resizeCol(
					$parentByType(col1, "Lhrs"), icol, col1, wd1, keys);
		}
	};

	//Listhead
	zkLhrs = zulHdrs;
});

////
// listbox mold=select //
zkLisel = {};
zkLisel.init = function (cmp) {
	zk.listen(cmp, "change", zkLisel.onchange);
	zk.listen(cmp, "focus", zkau.onfocus);
	zk.listen(cmp, "blur", zkau.onblur);
};
/** Handles onchange from select/list. */
zkLisel.onchange = function (evtel) {
	var cmp = zkau.evtel(evtel); //backward compatible with 2.4 or before
	var data, reference;
	if (cmp.multiple) {
		//To reduce # of bytes to send, we use a string instead of array.
		data = "";
		var opts = cmp.options;
		for (var j = 0, ol = opts.length; j < ol; ++j) {
			var opt = opts[j];
			if (opt.selected) {
				data += ","+opt.id;
				if (!reference) reference = opt.id;
			}
		}
		if (data) data = data.substring(1);
		//Design consideration: we could use defaultSelected to minimize
		//# of options to transmit. However, we often to set selectedIndex
		//which won't check defaultSelected
		//Besides, most of items are not selected
	} else {
		var opt = cmp.options[cmp.selectedIndex];
		data = opt.id;
		reference = opt.id;
	}
	var uuid = $uuid(cmp);
	zkau.send({uuid: uuid, cmd: "onSelect", data: [data, reference]},
			zkau.asapTimeout(uuid, "onSelect"));

	//Bug 1756559: see au.js
	if (zkau.lateReq) {
		zkau.send(zkau.lateReq, 25);
		delete zkau.lateReq;
	}
};