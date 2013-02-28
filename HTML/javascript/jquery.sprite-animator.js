/*!
 * jQuery spriteAnimator (revision 2013/02/28)
 * http://fili.nl
 * 
 * Copyright (c) Filidor Wiese, ONI
 * Licensed under LGPL 2.1 - http://www.gnu.org/licenses/lgpl-2.1.html
 */

// TODO:
//      - .tweenFromTo met easing
//      - .addAnimation()?
//      - run defineren by play()?
//      - crossbrowser

(function($) {
    $.spriteAnimator = function(element, options) {
        
        var plugin = this;
        
        var defaults = {
            debug: false,
            loaded: false,
            totalSprites: 0,
            sheetWidth: 0,
            sheetHeight: 0,
            frameWidth: 0,
            frameHeight: 0,
            cutOffFrames: 0,
            url: null,
            cols: null,
            rows: null,
            top: null,
            bottom: null,
            left: null,
            right: null,
            onLoaded: null
        };
        
        var anim = {
            play: true,
            delay: 50,
            tempo: 1,
            run: -1,
            reversed: false,
            outOfViewStop: false,
            script: [],
            lastTime: 0,
            nextDelay: 0,
            currentFrame: 0,
            currentSprite: 1,
            onPlay: null,
            onPause: null,
            onStop: null,
            onFrame: null
        };
        
        plugin.globals = {};
        plugin.playhead = {};
        
        var $element = $(element);
        
        /**
         * Constructor
         */
        plugin.init = function() {
            plugin.globals = $.extend({}, defaults, options);
            plugin.playhead = $.extend({}, anim, {});
            
            if (options.cols === undefined) { throw 'spriteAnimator: cols not set'; }
            if (options.rows === undefined) { throw 'spriteAnimator: rows not set'; }
            if (options.url === undefined) {
                // If no sprite is specified try to use background-image
                var cssBackgroundImage = $element.css("background-image");
                if (cssBackgroundImage == 'none') {
                    throw 'spriteAnimator: no spritesheet found';
                } else {
                    plugin.globals.url = cssBackgroundImage.replace(/"/g,"").replace(/url\(|\)$/ig, "");
                }
            }
                
            // Bind events
            $element.off('stop pause play reverse nextFrame previousFrame goToFrame showSprite setTempo');
            $element.on('stop', function(){
                plugin.stop();
            });
            $element.on('pause', function(){
                plugin.pause();
            });
            $element.on('play', function(event, options){
                plugin.play(options);
            });
            $element.on('reverse', function(){
                plugin.reverse();
            });
            $element.on('nextFrame', function(){
                plugin.nextFrame();
            });
            $element.on('previousFrame', function(){
                plugin.previousFrame();
            });
            $element.on('goToFrame', function(event, options){
                plugin.goToFrame(options);
            });
            $element.on('showSprite', function(event, options){
                plugin.showSprite(options);
            });
            $element.on('setTempo', function(event, options){
                plugin.setTempo(options);
            });
            
            _load();
        };
        
        /**
         * Get the current frameNumber from script
         */
        plugin.currentFrame = function() {
            return plugin.playhead.currentFrame;
        };

        /**
         * Get the current spriteNumber that is shown
         */
        plugin.currentSprite = function() {
            return plugin.playhead.currentSprite;
        };
        
        /**
         * Go forward one frame in script
         */
        plugin.nextFrame = function() {
            if (!plugin.globals.loaded) { return false; }

            // Update counter
            plugin.playhead.currentFrame += 1;
            if (plugin.playhead.currentFrame >= plugin.playhead.script.length) {
                plugin.playhead.currentFrame = 0;
                plugin.playhead.run -= 1;
            }
            
            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            _drawFrame(frame);
        };

        /**
         * Go back one frame in script
         */
        plugin.previousFrame = function() {
            if (!plugin.globals.loaded) { return false; }

            // Update counter
            plugin.playhead.currentFrame -= 1;
            if (plugin.playhead.currentFrame < 0) {
                plugin.playhead.currentFrame = plugin.playhead.script.length - 1;
                plugin.playhead.run -= 1;
            }
            
            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            _drawFrame(frame);
        };
        
        /**
         * Jump to certain frame in script
         */
        plugin.goToFrame = function(frameNumber) {
            if (!plugin.globals.loaded) { return false; }
            
            // floor framenumber
            frameNumber = Math.floor(frameNumber);
            
            // Make sure given framenumber is within the animation
            if (frameNumber >= 0) {
                if (frameNumber > (plugin.playhead.script.length - 1)) {
                    var _remainder = parseInt(frameNumber / (plugin.playhead.script.length - 1), 0);
                    frameNumber = frameNumber - (_remainder * plugin.playhead.script.length);
                }
            } else {
                // Negative numbers should be counted from the rear
                var _remainder = parseInt(frameNumber / (plugin.playhead.script.length - 1), 0);
                frameNumber = frameNumber - (_remainder * plugin.playhead.script.length);
                frameNumber = (plugin.playhead.script.length - 1) + frameNumber;
            }
            
            // Draw frame
            plugin.playhead.currentFrame = frameNumber;
            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            if (frame !== undefined) {
                _drawFrame(frame);
            }
        };
        
        /**
         * Show certain sprite
         */
        plugin.showSprite = function(spriteNumber) {
            _drawFrame({ sprite: spriteNumber });
        }
        
        /**
         * Define a new animation sequence or unpause if paused
         */
        plugin.play = function(options) {
            // New animation sequence
            if (typeof options == 'object') {
            
                // Start a new animation sequence
                plugin.playhead = $.extend({}, anim, options);
                
                // Auto script if not yet set
                if (plugin.playhead.script.length === 0) {
                    _autoScript();
                }
                
                // Enter the animation loop
                if (plugin.playhead.run !== 0) {
                    _loop();
                }
            } else {
                if (!plugin.playhead.play) {
                    plugin.playhead.play = true;
                    _loop();
                }
            }

            // onPlay callback
            if (typeof plugin.playhead.onPlay == 'function') {
                plugin.playhead.onPlay.call($element.data('spriteAnimator'));
            }
            
            // Trigger: started
            $element.trigger('started');
        };

        /**
         * Pause the animation loop
         */
        plugin.pause = function() {
            if (!plugin.playhead.play) { return false; }
            
            plugin.playhead.play = false;

            // onPause callback
            if (typeof plugin.playhead.onPause == 'function') {
                plugin.playhead.onPause.call($element.data('spriteAnimator'));
            }
            
            // Trigger: paused
            $element.trigger('paused');
        };
        
        /**
         * Reset playhead to first frame
         */
        plugin.reset = function() {
            plugin.goToFrame(0);
        };
        
        /**
         * Stop the animation and reset the playhead
         */
        plugin.stop = function(requestFrameId) {
            plugin.playhead.play = false;
            plugin.reset();
            
            // onStop callback
            if (typeof plugin.playhead.onStop == 'function') {
                plugin.playhead.onStop.call($element.data('spriteAnimator'));
            }

            // Trigger: stopped
            $element.trigger('stopped');
        };

        /**
         * Reverse direction of play
         */
        plugin.reverse = function() {
            plugin.playhead.reversed = !plugin.playhead.reversed;
        };

        /**
         * Set a new tempo for the animation
         */
        plugin.setTempo = function(tempo) {
            plugin.playhead.tempo = tempo;
        };
        
        /**
         * Generate a linear script based on the spritesheet itself
         */
        var _autoScript = function() {
            for (i=0; i < plugin.globals.totalSprites; i++) {
                plugin.playhead.script[i] = {sprite: (i + 1)};
            }
        }
        
        /**
         * Load the spritesheet and position it correctly
         */
        var _load = function() {
            var _preload = new Image();
            _preload.src = plugin.globals.url;
            
            _isLoaded(_preload, function(){
                if (plugin.globals.loaded) { return; } // <- Fix for some unexplained firefox bug that loads this twice.
                plugin.globals.loaded = true;

                _log('Loaded: ' + plugin.globals.url + ', sprites ' + plugin.globals.cols + ' x ' + plugin.globals.rows);
                
                plugin.globals.sheetWidth = _preload.width;
                plugin.globals.sheetHeight = _preload.height;
                plugin.globals.frameWidth = parseInt(plugin.globals.sheetWidth / plugin.globals.cols, 10);
                plugin.globals.frameHeight = parseInt(plugin.globals.sheetHeight / plugin.globals.rows, 10);
                plugin.globals.totalSprites = (plugin.globals.cols * plugin.globals.rows) - plugin.globals.cutOffFrames;
                
                if (plugin.globals.frameWidth % 1 > 0) {
                    throw 'spriteAnimator: frameWidth ' + plugin.globals.frameWidth + ' is not a whole number';
                }
                if (plugin.globals.frameHeight % 1 > 0) {
                    throw 'spriteAnimator: frameHeight ' + plugin.globals.frameHeight + ' is not a whole number';
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

                // Auto script if not yet set
                if (plugin.playhead.script.length === 0) {
                    _autoScript();
                }
                
                // Starting sprite?
                if (plugin.globals.startSprite > 1 && plugin.globals.startSprite <= plugin.globals.totalSprites) {
                    //_drawFrame({ sprite: plugin.globals.startSprite });
                    plugin.showSprite(plugin.globals.startSprite);
                }
                
                // onLoaded callback
                if (typeof plugin.globals.onLoaded == 'function') {
                    plugin.globals.onLoaded.call($element.data('spriteAnimator'));
                }

                // Trigger: loaded
                $element.trigger('loaded');
            });
        };

        /**
         * The animation loop
         */
        var _loop = function(time) {
            // Should be called as soon as possible
            var requestFrameId = window.requestAnimationFrame( _loop );
            
            //console.log(requestFrameId);
            
            // Wait until fully loaded
            if ($element !== null && plugin.globals.loaded && plugin.playhead.script.length > 0) {

                // Only play when not paused
                if (plugin.playhead.play) {
                    
                    // Throttle on nextDelay
                    if ((time - plugin.playhead.lastTime) >= plugin.playhead.nextDelay) {
                        
                        // Stop if run equals 0
                        if (plugin.playhead.run !== 0) {

                            // Render next frame only if element is visible and within viewport
                            if ($element.filter(':visible') && _inViewport($element)) {
                                
                                if (plugin.playhead.reversed) {
                                    plugin.previousFrame();
                                } else {
                                    plugin.nextFrame();
                                }

                                var frame = plugin.playhead.script[plugin.playhead.currentFrame];
                                plugin.playhead.nextDelay = (frame.delay != undefined ? frame.delay : plugin.playhead.delay);
                                plugin.playhead.nextDelay /= plugin.playhead.tempo;
                                plugin.playhead.lastTime = time;

                                
                            } else {
                                if (plugin.playhead.outOfViewStop) {
                                    plugin.stop();
                                }
                            }
                        } else {
                            plugin.stop();
                        }
                    }
                    
                } else {
                    // Cancel animation loop if play = false
                    window.cancelAnimationFrame(requestFrameId);
                }
            }
        };

        /**
         * Draw a single frame
         */
        var _drawFrame = function( frame ) {
            if (frame.sprite === plugin.playhead.currentSprite) { return false; }

            // onFrame callback
            if (typeof plugin.playhead.onFrame == 'function') {
                plugin.playhead.onFrame.call($element.data('spriteAnimator'));
            }
            
            // Trigger: frame
            $element.trigger('frame');
            
            var row = Math.ceil(frame.sprite / plugin.globals.cols);
            var col = frame.sprite - ((row - 1) * plugin.globals.cols);
            var bgX = ((col - 1) * plugin.globals.frameWidth) * -1;
            var bgY = ((row - 1) * plugin.globals.frameHeight) * -1;
            
            if (row > plugin.globals.rows || col > plugin.globals.cols) {
                throw 'spriteAnimator: position ' + frame.sprite + ' out of bound';
            }

            plugin.playhead.currentSprite = frame.sprite;

            _log('frame: ' + plugin.playhead.currentFrame + ', sprite: ' + frame.sprite + ', delay: ' + frame.delay);
            
            // Animate background
            $element.css('background-position', bgX + 'px ' + bgY + 'px');
            
            // Move if indicated
            if (frame.top != undefined) { $element.css('top', ($element.position().top + frame.top) + 'px'); }
            if (frame.bottom != undefined) { $element.css('bottom', ($element.position().bottom + frame.bottom) + 'px'); }
            if (frame.left != undefined) { $element.css('left', ($element.position().left + frame.left) + 'px'); }
            if (frame.right != undefined) { $element.css('right', ($element.position().right + frame.right) + 'px'); }
        };
        
        /**
         * Cross-browser test to make sure an image is loaded
         * Based on Paul Irish imagesLoaded plugin
         */
        var _isLoaded = function (element, _callback ) {
            var elems = $(element).filter('img'),
            len   = elems.length,
            blank = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
            
            elems.on('load.imgloaded', function(){
                if (--len <= 0 && this.src !== blank){ 
                    elems.off('load.imgloaded');
                    _callback.call(elems, this); 
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

        /**
         * Test to see if an element is within the viewport
         */
        var _inViewport = function(element) {
            var _aboveTop =  ($(window).scrollTop() >= $element.offset().top + plugin.globals.frameHeight);
            var _belowFold = ($(window).height() + $(window).scrollTop() <= $element.offset().top);
            var _leftOfScreen = ($(window).scrollLeft() >= $element.offset().left + plugin.globals.frameWidth);
            var _rightOfScreen = ($(window).width() + $(window).scrollLeft() <= $element.offset().left);
            return (!_aboveTop && !_belowFold && !_leftOfScreen && !_rightOfScreen);
        };

        /**
         * Logging, but only if debug is set to true
         */
        var _log = function(logline) {
            if (typeof console !== 'undefined' && plugin.globals.debug) {
                console.log('spriteAnimator: ' + logline);
            }
        };
        
        plugin.init();

    };

    /**
     * jQuery plugin wrapper
     * Boilerplate: http://stefangabos.ro/jquery/jquery-plugin-boilerplate-revisited/
     */
    $.fn.spriteAnimator = function(options) {
        return this.each(function() {
            if (undefined != $(this).data('spriteAnimator')) {
                $(this).removeData('spriteAnimator');
            }
            
            var plugin = new $.spriteAnimator(this, options);
            
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
