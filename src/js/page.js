/**
 * A lightweight single-page framework.
 *
 * @author Jared Allard <jaredallard@outlook.com
 * @version 0.1.0
 * @license MIT
 *
 */

/*
 * Page framework construct
 * @class
 */
function Page() {
  this.page = null;
  this.last = null;
  this.header = '#page-title';
  this.pages = {};

  $(this.header).hide();
  $("main").hide(); // hide all pages.
};

/**
 * Register a page.
 *
 * @param {object} po - object of the new page
 *
 * {
 *  name:   "page name", // name of room
 *  onBack: function(), // on resume from back button
 *  init:  function(), // on init
 *  exit: function(), // on exit from page (can take null)
 *  nav: true, // show navbar t/f (DEFAULT)
 *  back: true // can we go back or not (DEFAULT)
 * }
 */
Page.prototype.register = function (po) {
  // check register object
  console.log("page: register page attempt made");
  if (po.name === undefined) return false;
  if (po.onBack === undefined) return false;
  if (po.init === undefined) return false;
  if (po.title === undefined) return false;
  if (po.exit === undefined) return false;

  console.log("page: " + po.name + " registered");

  // add to our object
  this.pages[po.name] = po;
};

/**
 * Show page, usually used with <page>.exit
 **/
Page.prototype.show = function(_page) {
  $("main[page="+_page+"]").show(); // hide all pages.
};

/**
 * Hide page, usually used with <page>.exit
 **/
Page.prototype.hide = function(_page) {
  $("main[page="+_page+"]").hide(); // hide all pages.
};

/**
 * Set the current page
 *
 * @param {string} page - Page to set as current, and go to it.
 * @return {boolean} success
 */
Page.prototype.set = function (_page) {
  var po = {};

  /* check options */
  if (typeof (_page) === "object") {
    po = _page;
    _page = po.room;
  }

  if (this.pages[_page] === undefined) return false;
  console.log("Page ==> " + _page);

  // check if we are on a page, if so fire exit event.
  if (this.page !== null) {
    console.log(this.page + " => " + _page);

    if (typeof (this.pages[this.page].exit) === "function") { // execute if a function
      console.log("page: exec exit on '"+this.page+"'");
      this.pages[this.page].exit();
    }

    // set last page
    this.last = this.page;
  }

  // set page, before for debug terms
  this.page = _page;

  // lookup function init, then fire, along with the arguments it may expect.
  // @see http://stackoverflow.com/a/4775938/2174716
  var params = Array.prototype.slice.call(arguments);
  params.shift();

  // output our arguments to the console for debugging purposes
  // DEBUG: console.log(params);

  if (this.pages[_page].nav === false) {
    $(this.header).hide();
  } else {
    $(this.header).text(this.pages[this.page].title);
    $(this.header).show();
  }

  // call the function with extra arguments if needed
  if(po.exec !== false) this.pages[_page].init.apply(this, params);
};

/*
 * Return what our last page was
 *
 * @returns {string} Last page, false if not one yet
 */
Page.prototype.last = function () {
  return this.last;
};

/*
 * Get the page we are currently on.
 *
 * @returns {string} Page we are one, false if err
 */
Page.prototype.get = function () {
  return this.page;
};

/*
 * Go back to the last page we were on.
 */
Page.prototype.goBack = function () {
  var _page = this.last;

  if (this.pages[_page] === undefined) return false; // return false if the page isn't valid, or registered.
  console.log("Page ==> " + _page);

  // check if we are on a page, if so fire exit event.
  if (this.page !== null) {
    if (typeof (this.pages[this.page].exit) === "function") { // execute if a function
      this.pages[this.page].exit();
    }

    // set as last page
    this.last = this.page;
  }

  console.log(_page + " <= " + this.last);

  // set as the new page?
  this.set({ room: _page, exec: false });

  // fire the goBack event on the new page we're going back too, if it wants to show it will.
  this.pages[_page].onBack();
};

var page = new Page();
