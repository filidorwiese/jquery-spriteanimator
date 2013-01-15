/*!
 * jQuery spriteAnimator (revision 2012/06/04)
 * http://fili.nl
 * 
 * Copyright (c) Fili Wiese, ONI
 * Licensed under LGPL 2.1 - http://www.gnu.org/licenses/lgpl-2.1.html
 */

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
            outOfViewStop: false,
            cutOffFrames: 0,
            startFrame: 0,
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
            nextDelay: 0
        };
        
        plugin.settings = {};

        var $element = $(element);
        
        plugin.init = function() {
            plugin.settings = $.extend({}, defaults, options);
            plugin.globals = globals;
            
            if (options.cols === undefined) { $.error( 'spriteAnimator: cols not set' ); }
            if (options.rows === undefined) { $.error( 'spriteAnimator: rows not set' ); }
            if (options.url === undefined) {
                // If no sprite is specified try to use background-image
                plugin.settings.url = $element.css("background-image").replace(/"/g,"").replace(/url\(|\)$/ig, "");
            }
            plugin.load();
        };
        
        plugin.destroy = function() {
            $element.removeData('spriteAnimator');
            $element = null;
        };
        
        plugin.load = function() {
            var _preload = new Image();
            _preload.src = plugin.settings.url;
            
            _isLoaded(_preload, function(){
                // Fix for some unexplained firefox bug that loads this twice.
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
                        for (c = 0; c < plugin.settings.cutOffFrames ; c++) {
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

                // Bind stop event
                $element.off('stop').on('stop', function(){
                    plugin.stop();
                });
                
                //console.log('Loaded: ' + plugin.settings.url + ', sprites ' + plugin.globals.sheetCols + ' x ' + plugin.globals.sheetRows);

                // Pause?
                if (plugin.settings.run === 0) {
                    plugin.settings.play = false;
                }

                // Enter the animation loop
                if (plugin.settings.startFrame) {
                    plugin.globals.frameIterator = plugin.settings.startFrame;
                    plugin.goToFrame(plugin.globals.frameIterator);
                }
                
                //main.log(plugin.globals.frameIterator);
                //main.log(plugin.settings.frameIterator);
                //plugin.goToFrame(plugin.globals.frameIterator);
                plugin.loop();
            });
        };
        
        plugin.loop = function() {
            
            // Should be called as soon as possible
            requestAnimFrame( plugin.loop );
            
            // Element loaded and has script?
            if ($element !== null && plugin.globals.loaded && plugin.settings.script.length > 0) {
                
                // Throttle on nextDelay
                time = new Date();
                if ((time - plugin.globals.lastTime) >= plugin.globals.nextDelay) {
                    
                    // Render next frame only if element is visible and within viewport
                    if (plugin.settings.play) {
                        if ($element.filter(':visible') && _inViewport($element)) {
                            var frame = plugin.settings.script[plugin.globals.frameIterator];
                            plugin.globals.nextDelay = (frame.delay != undefined ? frame.delay : plugin.settings.delay);
                            plugin.globals.lastTime = time;
                            plugin.nextFrame();
                        } else {
                            if (plugin.settings.outOfViewStop) {
                                plugin.stop();
                            }
                        }
                    }
                    
                }
                
            }
        };

        plugin.nextFrame = function() {
            if (!plugin.globals.loaded) { return false; }
            
            var frame = plugin.settings.script[plugin.globals.frameIterator];
            _drawFrame(frame);
                        
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

        plugin.previousFrame = function() {
            if (!plugin.globals.loaded) { return false; }
            
            var frame = plugin.settings.script[plugin.globals.frameIterator];
            _drawFrame(frame);
            
            // Update counter
            plugin.globals.frameIterator -= 1;
            if (plugin.globals.frameIterator < 0) {
                plugin.globals.frameIterator = plugin.settings.script.length - 1;
                plugin.settings.run -= 1;
                if (plugin.settings.run === 0) {
                    plugin.stop();
                }
            }
        };

        plugin.goToFrame = function(frameNumber) {
            if (!plugin.globals.loaded) { return false; }
            
            // Make sure given framenumber is within the animation
            if (frameNumber > (plugin.settings.script.length - 1)) {
                var _remainder = parseInt(frameNumber / plugin.settings.script.length, 0);
                frameNumber = frameNumber - (_remainder * plugin.settings.script.length);
            }
            
            var frame = plugin.settings.script[frameNumber];
            if (frame !== undefined) {
                _drawFrame(frame);
            }
        };
        
        plugin.pause = function() {
            plugin.settings.play = false;
        };

        plugin.play = function(playhead) {
            if (typeof(playhead.reversed) !== 'undefined') {
                if (playhead.reversed) {
                    if (!plugin.settings.reversed) {
                        plugin.settings.reversed = playhead.reversed;
                        plugin.settings.script.reverse();
                    }
                } else {
                    if (plugin.settings.reversed) {
                        plugin.settings.reversed = playhead.reversed;
                        plugin.settings.script.reverse();
                    }
                }
            }
            if (typeof(playhead.run) !== 'undefined') {
                plugin.settings.run = playhead.run;
            }
            plugin.settings.play = true;
        };
        
        plugin.stop = function() {
            plugin.settings.play = false;
            if (typeof callback != 'undefined') {
                callback.call();
            }
        };
        
        var _drawFrame = function( frame ) {
            var row = Math.ceil(frame.frame / plugin.globals.sheetCols);
            var col = frame.frame - ((row - 1) * plugin.globals.sheetCols);
            var bgX = ((col - 1) * plugin.globals.frameWidth) * -1;
            var bgY = ((row - 1) * plugin.globals.frameHeight) * -1;
            
            if (row > plugin.globals.sheetRows || col > plugin.globals.sheetCols) {
                $.error( 'spriteAnimator: position ' + frame.frame + ' out of bound' );
            }
            
            //console.log('[' + plugin.globals.frameIterator + '] frame: ' + frame.frame + ', delay: ' + plugin.globals.nextDelay);
            
            // Animate background
            $element.css('background-position', bgX + 'px ' + bgY + 'px');
            
            // Move if indicated
            if (frame.top != undefined) { $element.css('top', ($element.position().top + frame.top) + 'px'); }
            if (frame.bottom != undefined) { $element.css('bottom', ($element.position().bottom + frame.bottom) + 'px'); }
            if (frame.left != undefined) { $element.css('left', ($element.position().left + frame.left) + 'px'); }
            if (frame.right != undefined) { $element.css('right', ($element.position().right + frame.right) + 'px'); }
        };
        
        // Based on Paul Irish imagesLoaded plugin
        var _isLoaded = function (element, _callback ) {
            var elems = $(element).filter('img'),
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

        // Test to see if element is within the viewport
        var _inViewport = function(element) {
            var _aboveTop =  ($(window).scrollTop() >= $element.offset().top + plugin.globals.frameHeight);
            var _belowFold = ($(window).height() + $(window).scrollTop() <= $element.offset().top);
            var _leftOfScreen = ($(window).scrollLeft() >= $element.offset().left + plugin.globals.frameWidth);
            var _rightOfScreen = ($(window).width() + $(window).scrollLeft() <= $element.offset().left);
            return (!_aboveTop && !_belowFold && !_leftOfScreen && !_rightOfScreen);
        };
        
        plugin.init();

    };

    // Boilerplate: http://stefangabos.ro/jquery/jquery-plugin-boilerplate-revisited/
    $.fn.spriteAnimator = function(options, callback) {
        return this.each(function() {
            if (undefined != $(this).data('spriteAnimator')) {
                $(this).data('spriteAnimator').destroy();
            }
            
            var plugin = new $.spriteAnimator(this, options, callback);
            
            $(this).data('spriteAnimator', plugin);
        });
    };
    
})(jQuery);


/**
 * Polyfill: requestAnimationFrame by Paul Irish
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
if (!window.requestAnimFrame) {
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();
}
