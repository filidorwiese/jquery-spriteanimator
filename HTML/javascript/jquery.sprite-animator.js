/*!
 * jQuery spriteAnimator (revision 2012/03/14)
 * http://fili.nl
 * 
 * Copyright (c) Fili Wiese, ONI
 * Licensed under LGPL 2.1 - http://www.gnu.org/licenses/lgpl-2.1.html
 * 
 * Includes;
 *   jQuery Plugin Boilerplate by Stefan Gabos
 *   http://stefangabos.ro/jquery/jquery-plugin-boilerplate-revisited/
 * 
 *   window.requestAnimFrame by Paul Irish
 *   http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

window.requestAnimFrame = (function(){
  return window.requestAnimationFrame       || 
		 window.webkitRequestAnimationFrame || 
		 window.mozRequestAnimationFrame    || 
		 window.oRequestAnimationFrame      || 
		 window.msRequestAnimationFrame     || 
		 function(callback, element){
			window.setTimeout(callback, 1000 / 60);
		 };
})();

(function($) {
    $.spriteAnimator = function(element, options, callback) {
		
        var plugin = this;
        
        var defaults = {
			play: true,
			url: null,
			delay: 50,
			run: 0,
			reversed: false,
			cols: null,
			rows: null,
			top: null,
			bottom: null,
			left: null,
			right: null,
			script: []
        };
        
        var globals = {
			loaded: false,
			sheetWidth: 0,
			sheetHeight: 0,
			sheetCols: 0,
			sheetRows: 0,
			frameWidth: 0,
			frameHeight: 0,
			frameIterator: 0,
			lastTime: 0,
			nextDelay: 0,
			outOfSightDie: false,
			cutOffFrames: 0
		};
        
        // this will hold the merged default, and user-provided options
        // plugin's properties will be available through this object like:
        // plugin.settings.propertyName from inside the plugin or
        // element.data('pluginName').settings.propertyName from outside the plugin, where "element" is the
        // element the plugin is attached to;
        plugin.settings = {};

        var $element = $(element);
		
		// constructor
        plugin.init = function() {
            plugin.settings = $.extend({}, defaults, options);
			plugin.globals = globals;
			
			if (options.cols === undefined) { $.error( 'spriteAnimator: cols not set' ); }
			if (options.rows === undefined) { $.error( 'spriteAnimator: rows not set' ); }
			
			plugin.load();
        };
		
		// destructor
		plugin.destroy = function() {
			$element.removeData('spriteAnimator');
			$element = null;
		};
		
		// public methods
        // these methods can be called like:
        // plugin.methodName(arg1, arg2, ... argn) from inside the plugin or
        // element.data('pluginName').publicMethod(arg1, arg2, ... argn) from outside the plugin, where "element"
        // is the element the plugin is attached to;
		plugin.load = function() {
			var _preload = new Image();
			_preload.src = plugin.settings.url;
			
			_isLoaded(_preload, function(){
				// FIX for some unexplained firefox bug that loads this twice.
				if (plugin.globals.loaded) { return; }

				plugin.globals.loaded = true;
				plugin.globals.sheetWidth = _preload.width;
				plugin.globals.sheetHeight = _preload.height;
				
				plugin.globals.frameWidth = parseInt(plugin.globals.sheetWidth / plugin.settings.cols, 10);
				plugin.globals.frameHeight = parseInt(plugin.globals.sheetHeight / plugin.settings.rows, 10);
				plugin.globals.sheetCols = plugin.settings.cols;
				plugin.globals.sheetRows = plugin.settings.rows;
				if (plugin.globals.frameWidth % 1 > 0) {
					$.error( 'spriteAnimator: frameWidth ' + plugin.globals.frameWidth + ' is not a whole number' );
				}
				if (plugin.globals.frameHeight % 1 > 0) {
					$.error( 'spriteAnimator: frameHeight ' + plugin.globals.frameHeight + ' is not a whole number' );
				}
				
				if (plugin.settings.script.length === 0) {
					for (i=0; i < (plugin.globals.sheetCols * plugin.globals.sheetRows); i++) {
						plugin.settings.script[i] = {frame: (i + 1)};
					}
					if (plugin.settings.cutOffFrames > 0) {
						for (c = 0; c < plugin.settings.cutOffFrames ; c++)	{
							plugin.settings.script.pop();
						}
					}
				}
				
				if (plugin.settings.reversed) {
					plugin.settings.script.reverse();
				}
				
				$element.css({
					position: 'absolute',
					width: plugin.globals.frameWidth,
					height: plugin.globals.frameHeight,
					backgroundImage: 'url('+plugin.settings.url+')'
				});
				
				if (plugin.settings.top !== null) {
					if (plugin.settings.top == 'center') {
						$element.css({top: '50%', marginTop: plugin.globals.frameHeight / 2 * -1});
					} else {
						$element.css({top: plugin.settings.top});
					}
				}
				if (plugin.settings.right !== null) {
					$element.css({right: plugin.settings.right});
				}
				if (plugin.settings.bottom !== null) {
					$element.css({bottom: plugin.settings.bottom});
				}
				if (plugin.settings.left !== null) {
					if (plugin.settings.left == 'center') {
						$element.css({left: '50%', marginLeft: plugin.globals.frameWidth / 2 * -1});
					} else {
						$element.css({left: plugin.settings.left});
					}
				}
				
				$element.off('stop').on('stop', function(){
					plugin.stop();
				});
				
				universe.log('Loaded: ' + plugin.settings.url + ', sprites ' + plugin.globals.sheetCols + ' x ' + plugin.globals.sheetRows);
				
				plugin.play();
			});
		};
		
		plugin.play = function() {
			if ($element !== null && $element.filter(':visible')) {
				if (plugin.globals.loaded && plugin.settings.script.length > 0) {
					time = new Date();
					if ((time - plugin.globals.lastTime) >= plugin.globals.nextDelay) {
						
						if (plugin.settings.play) {
							var frame = plugin.settings.script[plugin.globals.frameIterator];
							var delay = (frame.delay != undefined ? frame.delay : plugin.settings.delay);
							
							//universe.log('[' + plugin.globals.frameIterator + '] frame: ' + frame.frame + ', delay: ' + delay);
							_next(frame);
							
							if (plugin.settings.outOfSightDie) {
								var _viewportWidth = $(document).width();
								var _viewportHeight = $(document).height();
								var _elementLeft = $element.offset().left;
								var _elementTop = $element.offset().top;
								if ((_elementLeft > _viewportWidth || _elementLeft < 0) ||
									(_elementTop > _viewportHeight || _elementTop < 0))	{
										plugin.stop();
								}
							}
							
							plugin.globals.lastTime = time;
							plugin.globals.nextDelay = delay;
						} else {
							plugin.stop();
						}
					}
				}
			}
			requestAnimFrame( plugin.play );
        };
        
        plugin.stop = function() {
			plugin.settings.play = false;
			callback.call(); 
		};
		
        // private methods
        // these methods can be called only from inside the plugin like:
        // methodName(arg1, arg2, ... argn)
        var _next = function( frame ) {
			var row = Math.ceil(frame.frame / plugin.globals.sheetCols);
			var col = frame.frame - ((row - 1) * plugin.globals.sheetCols);
			var bgX = ((col - 1) * plugin.globals.frameWidth) * -1;
			var bgY = ((row - 1) * plugin.globals.frameHeight) * -1;
			
			if (row > plugin.globals.sheetRows || col > plugin.globals.sheetCols) {
				$.error( 'spriteAnimator: position ' + frame.frame + ' out of bound' );
			}
			
			// Animate background
			$element.css('background-position', bgX + 'px ' + bgY + 'px');
			
			// Move if indicated
			if (frame.top != undefined) { $element.css('top', ($element.position().top + frame.top) + 'px'); }
			if (frame.bottom != undefined) { $element.css('bottom', ($element.position().bottom + frame.bottom) + 'px'); }
			if (frame.left != undefined) { $element.css('left', ($element.position().left + frame.left) + 'px'); }
			if (frame.right != undefined) { $element.css('right', ($element.position().right + frame.right) + 'px'); }
			
			// Update counter
			plugin.globals.frameIterator += 1;
			if (plugin.globals.frameIterator >= plugin.settings.script.length) {
				plugin.globals.frameIterator = 0;
				plugin.settings.run -= 1;
				if (plugin.settings.run === 0) {
					plugin.stop();
				}
			}
        };
        
		// Based on paul irish imagesLoaded plugin
		var _isLoaded = function ( el, _callback ) {
			var elems = $(el).filter('img'),
			len   = elems.length,
			blank = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
			
			elems.on('load.imgloaded', function(){
				if (--len <= 0 && this.src !== blank){ 
					elems.off('load.imgloaded');
					_callback.call(elems,this); 
				}
			}).each(function(){
				// cached images don't fire load sometimes, so we reset src.
				if (this.complete || this.complete === undefined){
					var src = this.src;
					// webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
					// data uri bypasses webkit log warning (thx doug jones)
					this.src = blank;
					this.src = src;
				}  
			});
			
			return this;
		};
  
        plugin.init();

    };

    // add the plugin to the jQuery.fn object
    $.fn.spriteAnimator = function(options, callback) {
		
        // iterate through the DOM elements we are attaching the plugin to
        return this.each(function() {
            // destroy if plugin has already been attached to the element
            if (undefined != $(this).data('spriteAnimator')) {
				$(this).data('spriteAnimator').destroy();
			}
			
			// create a new instance of the plugin
			// pass the DOM element and the user-provided options as arguments
			var plugin = new $.spriteAnimator(this, options, callback);
			
			// in the jQuery version of the element
			// store a reference to the plugin object
			// you can later access the plugin and its methods and properties like
			// element.data('pluginName').publicMethod(arg1, arg2, ... argn) or
			// element.data('pluginName').settings.propertyName
			$(this).data('spriteAnimator', plugin);
        });
    };
	
})(jQuery);
