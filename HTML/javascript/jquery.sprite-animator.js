/*!
 * jQuery spriteAnimator (revision 2013/01/22)
 * http://fili.nl
 * 
 * Copyright (c) Filidor Wiese, ONI
 * Licensed under LGPL 2.1 - http://www.gnu.org/licenses/lgpl-2.1.html
 */

(function($) {
    $.spriteAnimator = function(element, options, callback) {
        
        var plugin = this;
        
        var defaults = {
            loaded: false,
            sheetWidth: 0,
            sheetHeight: 0,
            sheetCols: 0,
            sheetRows: 0,
            frameWidth: 0,
            frameHeight: 0,
            frameIterator: 0,
            url: null,
            cols: null,
            rows: null,
            top: null,
            bottom: null,
            left: null,
            right: null,
            cutOffFrames: 0
        };
        
        var anim = {
            play: true,
            pause: false,
            delay: 50,
            run: 1,
            reversed: false,
            script: [],
            outOfViewStop: false,
            startFrame: 0,
            lastTime: 0,
            nextDelay: 0
        };
        
        plugin.globals = {};
        plugin.playhead = {};
        
        var $element = $(element);
        
        plugin.init = function() {
            plugin.globals = $.extend({}, defaults, options);
            plugin.playhead = $.extend({}, anim, {});
            
            if (options.cols === undefined) { $.error( 'spriteAnimator: cols not set' ); }
            if (options.rows === undefined) { $.error( 'spriteAnimator: rows not set' ); }
            if (options.url === undefined) {
                // If no sprite is specified try to use background-image
                plugin.globals.url = $element.css("background-image").replace(/"/g,"").replace(/url\(|\)$/ig, "");
            }
            
            _load();
        };
        
        plugin.nextFrame = function() {
            if (!plugin.globals.loaded) { return false; }
            
            var frame = plugin.playhead.script[plugin.globals.frameIterator];
            _drawFrame(frame);
                        
            // Update counter
            plugin.globals.frameIterator += 1;
            if (plugin.globals.frameIterator >= plugin.playhead.script.length) {
                plugin.globals.frameIterator = 0;
                plugin.playhead.run -= 1;
                if (plugin.playhead.run === 0) {
                    plugin.playhead.play = false;
                }
            }
        };

        plugin.previousFrame = function() {
            if (!plugin.globals.loaded) { return false; }
            
            var frame = plugin.playhead.script[plugin.globals.frameIterator];
            _drawFrame(frame);
            
            // Update counter
            plugin.globals.frameIterator -= 1;
            if (plugin.globals.frameIterator < 0) {
                plugin.globals.frameIterator = plugin.playhead.script.length - 1;
                plugin.playhead.run -= 1;
                if (plugin.playhead.run === 0) {
                    plugin.playhead.play = false;
                }
            }
        };

        plugin.goToFrame = function(frameNumber) {
            if (!plugin.globals.loaded) { return false; }
            
            // Make sure given framenumber is within the animation
            if (frameNumber > 0) {
                frameNumber -= 1;
                if (frameNumber > plugin.playhead.script.length) {
                    var _remainder = parseInt(frameNumber / plugin.playhead.script.length, 0);
                    frameNumber = frameNumber - (_remainder * plugin.playhead.script.length);
                }
            } else {
                // Negative numbers should be counted from the rear
                frameNumber = plugin.playhead.script.length + frameNumber;
            }

            // Still below the first frame? Do nothing.
            if (frameNumber < 1) {
                return false;
            }
            
            // Go to frame
            var frame = plugin.playhead.script[frameNumber];
            if (frame !== undefined) {
                _drawFrame(frame);
            }
        };

        plugin.pause = function() {
            plugin.playhead.play = false;
            plugin.playhead.pause = true;
        };

        plugin.play = function(options) {
            if (!plugin.playhead.pause) {
                // Start a new animation
                plugin.playhead = $.extend({}, anim, options);
                
                if (plugin.playhead.startFrame) {
                    plugin.globals.frameIterator = plugin.playhead.startFrame;
                    plugin.goToFrame(plugin.globals.frameIterator);
                }
                
                // Reverse script if set
                if (plugin.playhead.script.length && plugin.playhead.reversed) {
                    plugin.playhead.script.reverse();
                }
            }
            
            // Enter the animation loop
            if (plugin.playhead.run !== 0) {
                plugin.playhead.play = true;
                plugin.playhead.pause = false;
                _loop();
            }
        };
        
        plugin.stop = function(requestFrameId) {
            plugin.playhead.play = false;
            
            if (typeof requestFrameId != 'undefined') {
                window.cancelAnimationFrame(requestFrameId);
            }
            
            if (typeof callback != 'undefined') {
                callback.call();
            }
        };
        
        var _load = function() {
            var _preload = new Image();
            _preload.src = plugin.globals.url;
            
            _isLoaded(_preload, function(){
                // Fix for some unexplained firefox bug that loads this twice.
                if (plugin.globals.loaded) { return; }

                plugin.globals.sheetWidth = _preload.width;
                plugin.globals.sheetHeight = _preload.height;
                
                plugin.globals.frameWidth = parseInt(plugin.globals.sheetWidth / plugin.globals.cols, 10);
                plugin.globals.frameHeight = parseInt(plugin.globals.sheetHeight / plugin.globals.rows, 10);
                plugin.globals.sheetCols = plugin.globals.cols;
                plugin.globals.sheetRows = plugin.globals.rows;
                if (plugin.globals.frameWidth % 1 > 0) {
                    $.error( 'spriteAnimator: frameWidth ' + plugin.globals.frameWidth + ' is not a whole number' );
                }
                if (plugin.globals.frameHeight % 1 > 0) {
                    $.error( 'spriteAnimator: frameHeight ' + plugin.globals.frameHeight + ' is not a whole number' );
                }
                
                $element.css({
                    position: 'absolute',
                    width: plugin.globals.frameWidth,
                    height: plugin.globals.frameHeight,
                    backgroundImage: 'url('+plugin.globals.url+')',
                    backgroundPosition: '0 0'
                });
                
                if (plugin.globals.top !== null) {
                    if (plugin.globals.top == 'center') {
                        $element.css({top: '50%', marginTop: plugin.globals.frameHeight / 2 * -1});
                    } else {
                        $element.css({top: plugin.globals.top});
                    }
                }
                if (plugin.globals.right !== null) {
                    $element.css({right: plugin.globals.right});
                }
                if (plugin.globals.bottom !== null) {
                    $element.css({bottom: plugin.globals.bottom});
                }
                if (plugin.globals.left !== null) {
                    if (plugin.globals.left == 'center') {
                        $element.css({left: '50%', marginLeft: plugin.globals.frameWidth / 2 * -1});
                    } else {
                        $element.css({left: plugin.globals.left});
                    }
                }
                
                // Bind stop event
                $element.off('stop').on('stop', function(){
                    plugin.playhead.play = false;
                });

                // Auto script if not yet set
                if (plugin.playhead.script.length === 0) {
                    for (i=0; i < (plugin.globals.sheetCols * plugin.globals.sheetRows); i++) {
                        plugin.playhead.script[i] = {frame: (i + 1)};
                    }
                    
                    // CutOff a frame?
                    if (plugin.globals.cutOffFrames > 0) {
                        for (c = 0; c < plugin.globals.cutOffFrames ; c++) {
                            plugin.playhead.script.pop();
                        }
                    }
                    
                    // Reverse the script?
                    if (plugin.playhead.reversed) {
                        plugin.playhead.script.reverse();
                    }
                }
                
                plugin.globals.loaded = true;
                
                //console.log('Loaded: ' + plugin.globals.url + ', sprites ' + plugin.globals.sheetCols + ' x ' + plugin.globals.sheetRows);
            });
        };

        var _loop = function(time) {
            
            // Should be called as soon as possible
            var requestFrameId = window.requestAnimationFrame( _loop );
            //console.log(requestFrameId);
            
            // Wait until fully loaded
            if ($element !== null && plugin.globals.loaded && plugin.playhead.script.length > 0) {
                // Throttle on nextDelay
                if ((time - plugin.playhead.lastTime) >= plugin.playhead.nextDelay) {
                    
                    // Render next frame only if element is visible and within viewport
                    if (plugin.playhead.play) {
                        if ($element.filter(':visible') && _inViewport($element)) {
                            var frame = plugin.playhead.script[plugin.globals.frameIterator];
                            plugin.playhead.nextDelay = (frame.delay != undefined ? frame.delay : plugin.playhead.delay);
                            plugin.playhead.lastTime = time;
                            plugin.nextFrame();
                        } else {
                            if (plugin.playhead.outOfViewStop) {
                                plugin.stop(requestFrameId);
                            }
                        }
                    } else {
                        plugin.stop(requestFrameId);
                    }
                    
                }
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
            
            //console.log('[' + plugin.globals.frameIterator + '] frame: ' + frame.frame + ', delay: ' + plugin.playhead.nextDelay);
            
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
                $(this).removeData('spriteAnimator');
            }
            
            var plugin = new $.spriteAnimator(this, options, callback);
            
            $(this).data('spriteAnimator', plugin);
        }).data('spriteAnimator');
    };
    
})(jQuery);

/**
 * Polyfill: requestAnimationFrame by Paul Irish
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
