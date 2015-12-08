/*!
 * jQuery spriteAnimator (revision 2013/03/04)
 * http://fili.nl
 * 
 * Copyright (c) Filidor Wiese, ONI
 * Licensed under LGPL 2.1 - http://www.gnu.org/licenses/lgpl-2.1.html
 */

// TODO:
//      - .tweenFromTo met easing
//      - keep or remove triggers?
//      - crossbrowser
//      - previousFrame/nextFrame logging?

(function($) {
    
    /**
     * spriteAnimator
     * @element:
     * @options: object to override global options with, the following properties can be set
     *           - debug: show debug logging in console (default: false)
     *           - url: url to spriteSheet, if not set the css background-image will be used
     *           - cols: number columns in the spritesheet (mandatory)
     *           - rows: number rows in the spritesheet (mandatory)
     *           - cutOffFrames: number of sprites not used in the spritesheet (default: 0)
     *           - top/bottom/left/right: starting offset position
     *           - startSprite: number of the first sprite to show when done loading
     *           - onLoaded: callback that will be called when loading has finished
     */
     
    $.spriteAnimator = function(element, options) {
        
        var plugin = this;
        
        var globalDefaults = {
            debug: false,
            url: null,
            cols: null,
            rows: null,
            cutOffFrames: 0,
            top: null,
            bottom: null,
            left: null,
            right: null,
            startSprite: 1,
            onLoaded: null
        };
        
        var animationDefaults = {
            play: true,
            delay: 50,
            tempo: 1,
            run: 1,
            reversed: false,
            outOfViewStop: false,
            script: [],
            lastTime: 0,
            nextDelay: 0,
            currentFrame: -1,
            currentSprite: 1,
            onPlay: null,
            onStop: null,
            onFrame: null
        };
        
        plugin.internal = {
            loaded: false,
            totalSprites: 0,
            sheetWidth: 0,
            sheetHeight: 0,
            frameWidth: 0,
            frameHeight: 0,
            animations: {}
        };
        
        plugin.globals = {};
        
        plugin.playhead = {};
        
        var $element = $(element);
        
        /**
         * Initializes the spriteAnimator
         */
        plugin.init = function() {
            plugin.globals = $.extend({}, globalDefaults, options);
            
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
            if (!plugin.internal.loaded) { return false; }

            // Update counter
            plugin.playhead.currentFrame += 1;
            if (plugin.playhead.currentFrame > (plugin.playhead.script.length - 1)) {
                plugin.playhead.currentFrame = 0;
            }
            if (plugin.playhead.currentFrame == plugin.playhead.script.length - 1) {
                plugin.playhead.run -= 1;
            }

            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            _drawFrame(frame);
        };
        $element.off('nextFrame').on('nextFrame', function(){
            plugin.nextFrame();
        });

        /**
         * Go back one frame in script
         */
        plugin.previousFrame = function() {
            if (!plugin.internal.loaded) { return false; }

            // Update counter
            plugin.playhead.currentFrame -= 1;
            if (plugin.playhead.currentFrame < 0) {
                plugin.playhead.currentFrame = (plugin.playhead.script.length - 1);
            }
            if (plugin.playhead.currentFrame == 0) {
                plugin.playhead.run -= 1;
            }
            
            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            _drawFrame(frame);
        };
        $element.off('previousFrame').on('previousFrame', function(){
            plugin.previousFrame();
        });
        
        /**
         * Jump to certain frame within current animation sequence
         */
        plugin.goToFrame = function(frameNumber) {
            if (!plugin.internal.loaded) { return false; }
            
            // Make sure given framenumber is within the animation
            var _baseNumber = Math.floor(frameNumber / plugin.playhead.script.length);
            frameNumber = Math.floor(frameNumber - (_baseNumber * plugin.playhead.script.length));
            
            // Draw frame
            plugin.playhead.currentFrame = frameNumber;
            var frame = plugin.playhead.script[plugin.playhead.currentFrame];
            if (frame !== undefined) {
                _log('frame: ' + plugin.playhead.currentFrame + ', sprite: ' + frame.sprite);
                _drawFrame(frame);
            }
        };
        $element.off('goToFrame').on('goToFrame', function(event, param1){
            plugin.goToFrame(param1);
        });
        
        /**
         * Show certain sprite (circumvents the current animation sequence)
         */
        plugin.showSprite = function(spriteNumber) {
            plugin.playhead.play = false;
            _drawFrame({ sprite: spriteNumber });
        };
        $element.off('showSprite').on('showSprite', function(event, param1){
            plugin.showSprite(param1);
        });

        /**
         * Add a named animation sequence
         * @name: string
         * @script: array with objects as frames, eg [{sprite: 1, delay: 200}, {sprite: 3, top:1 }]
         *          each frame can have the following properties
         *          - sprite: which sprite to show (mandatory)
         *          - delay: alternate delay then the default delay
         *          - top/left/bottom/right: reposition the placeholder
         */
        plugin.addScript = function(name, script) {
            // TODO: input type validatie
            plugin.internal.animations[name] = script;
        };
        
        /**
         * Define a new animation sequence or resume if not playing
         * @animationObject:
         *          if object with animation settings, the following are allowed
         *              - play: start playing the animation right away (default: true)
         *              - run: the number of times the animation should run, -1 is infinite (default: 1)
         *              - delay: default delay for all frames that don't have a delay set (default: 50)
         *              - tempo: timescale for all delays, double-speed = 2, half-speed = .5 (default:1)
         *              - reversed: direction of the animation head, true == backwards (default: false)
         *              - outOfViewStop: stop animation if placeholder is no longer in view (default: false)
         *              - script: new animation array or string (in which case animation sequence is looked up)
         *              - onPlay/onStop/onFrame: callbacks called at the appropriate times (default: null)
         *          if not set, we resume the current animation or start the 'all' built-in animation sequence
         */
        plugin.play = function(animationObject) {
            // Not yet loaded, wait...
            if (!plugin.internal.loaded) {
                setTimeout(function(){ plugin.play(animationObject); }, 50);
                return false;
            }

            if (typeof animationObject == 'object') {
                if (typeof animationObject.script == 'string') { // Resolve to stored animation sequence
                    animationObject.script = plugin.internal.animations[animationObject.script];
                }
                if (typeof animationObject.script == 'undefined') {
                    animationObject.script = plugin.internal.animations['all'];
                }
                plugin.playhead = $.extend({}, animationDefaults, animationObject);
            } else {
                if (!plugin.playhead.play) {
                    if (plugin.playhead.run === 0) { plugin.playhead.run = 1; }
                    plugin.playhead.play = true;
                    _loop();
                }
            }
            
            // Enter the animation loop
            if (plugin.playhead.run !== 0) {
                _loop();
            }

            // onPlay callback
            if (typeof plugin.playhead.onPlay == 'function') {
                plugin.playhead.onPlay.call($element.data('spriteAnimator'));
            }
            
            // Trigger: started
            //$element.trigger('started');
        };
        $element.off('play').on('play', function(event, param1, param2){
            plugin.play(param1, param2);
        });
        
        /**
         * Reset playhead to first frame
         */
        plugin.reset = function() {
            plugin.goToFrame(0);
        };
        $element.off('reset').on('reset', function(event){
            plugin.reset();
        });
        
        /**
         * Stop the animation and reset the playhead
         */
        plugin.stop = function(requestFrameId) {
            plugin.playhead.play = false;
            
            // onStop callback
            if (typeof plugin.playhead.onStop == 'function') {
                plugin.playhead.onStop.call($element.data('spriteAnimator'));
            }

            // Trigger: stopped
            //$element.trigger('stopped');
        };
        $element.off('stop').on('stop', function(event){
            plugin.stop();
        });
        
        /**
         * Reverse direction of play
         */
        plugin.reverse = function() {
            plugin.playhead.reversed = !plugin.playhead.reversed;
        };
        $element.off('reverse').on('reverse', function(event){
            plugin.reverse();
        });

        /**
         * Set a new tempo for the animation
         */
        plugin.setTempo = function(tempo) {
            plugin.playhead.tempo = tempo;
        };
        $element.off('setTempo').on('setTempo', function(event, param1){
            plugin.setTempo(param1);
        });
        
        /**
         * Generate a linear script based on the spritesheet itself
         */
        var _autoScript = function() {
            var script = [];
            for (i=0; i < plugin.internal.totalSprites; i++) {
                script[i] = {sprite: (i + 1)};
            }
            plugin.addScript('all', script);
        };
        
        /**
         * Load the spritesheet and position it correctly
         */
        var _load = function() {
            var _preload = new Image();
            _preload.src = plugin.globals.url;
            
            _isLoaded(_preload, function(){
                if (plugin.internal.loaded) { return; } // <- Fix for some unexplained firefox bug that loads this twice.
                plugin.internal.loaded = true;

                _log('Loaded: ' + plugin.globals.url + ', sprites ' + plugin.globals.cols + ' x ' + plugin.globals.rows);
                
                plugin.internal.sheetWidth = _preload.width;
                plugin.internal.sheetHeight = _preload.height;
                plugin.internal.frameWidth = parseInt(plugin.internal.sheetWidth / plugin.globals.cols, 10);
                plugin.internal.frameHeight = parseInt(plugin.internal.sheetHeight / plugin.globals.rows, 10);
                plugin.internal.totalSprites = (plugin.globals.cols * plugin.globals.rows) - plugin.globals.cutOffFrames;
                
                if (plugin.internal.frameWidth % 1 > 0) {
                    throw 'spriteAnimator: frameWidth ' + plugin.internal.frameWidth + ' is not a whole number';
                }
                if (plugin.internal.frameHeight % 1 > 0) {
                    throw 'spriteAnimator: frameHeight ' + plugin.internal.frameHeight + ' is not a whole number';
                }
                
                $element.css({
                    position: 'absolute',
                    width: plugin.internal.frameWidth,
                    height: plugin.internal.frameHeight,
                    backgroundImage: 'url('+plugin.globals.url+')',
                    backgroundPosition: '0 0'
                });
                
                if (plugin.globals.top !== null) {
                    if (plugin.globals.top == 'center') {
                        $element.css({top: '50%', marginTop: plugin.internal.frameHeight / 2 * -1});
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
                        $element.css({left: '50%', marginLeft: plugin.internal.frameWidth / 2 * -1});
                    } else {
                        $element.css({left: plugin.globals.left});
                    }
                }

                // Auto script the first 'all' animation sequence and make it default
                _autoScript();
                animationObject = { script: plugin.internal.animations['all'] };
                plugin.playhead = $.extend({}, animationDefaults, animationObject);
                
                // Starting sprite?
                if (plugin.globals.startSprite > 1 && plugin.globals.startSprite <= plugin.internal.totalSprites) {
                    plugin.showSprite(plugin.globals.startSprite);
                }
                
                // onLoaded callback
                if (typeof plugin.globals.onLoaded == 'function') {
                    plugin.globals.onLoaded.call($element.data('spriteAnimator'));
                }

                // Trigger: loaded
                //$element.trigger('loaded');
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
            if ($element !== null && plugin.internal.loaded) {

                // Only play when not paused
                if (plugin.playhead.play) {
                    
                    // Throttle on nextDelay
                    if ((time - plugin.playhead.lastTime) >= plugin.playhead.nextDelay) {
                        
                        // Render next frame only if element is visible and within viewport
                        if ($element.filter(':visible') && _inViewport($element)) {

                            // Only play if run counter is still <> 0
                            if (plugin.playhead.run === 0) {
                                plugin.stop();
                            } else {
                                
                                if (plugin.playhead.reversed) {
                                    plugin.previousFrame();
                                } else {
                                    plugin.nextFrame();
                                }

                                var frame = plugin.playhead.script[plugin.playhead.currentFrame];
                                plugin.playhead.nextDelay = (frame.delay != undefined ? frame.delay : plugin.playhead.delay);
                                plugin.playhead.nextDelay /= plugin.playhead.tempo;
                                plugin.playhead.lastTime = time;
                                
                                _log('frame: ' + plugin.playhead.currentFrame + ', sprite: ' + frame.sprite + ', delay: ' + plugin.playhead.nextDelay + ', run: ' + plugin.playhead.run);
                            }
                            
                        } else {
                            if (plugin.playhead.outOfViewStop) {
                                plugin.stop();
                            }
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
            plugin.playhead.currentSprite = frame.sprite;
            
            var row = Math.ceil(frame.sprite / plugin.globals.cols);
            var col = frame.sprite - ((row - 1) * plugin.globals.cols);
            var bgX = ((col - 1) * plugin.internal.frameWidth) * -1;
            var bgY = ((row - 1) * plugin.internal.frameHeight) * -1;
            
            if (row > plugin.globals.rows || col > plugin.globals.cols) {
                throw 'spriteAnimator: position ' + frame.sprite + ' out of bound';
            }
            
            // Animate background
            $element.css('background-position', bgX + 'px ' + bgY + 'px');
            
            // Move if indicated
            if (frame.top != undefined) { $element.css('top', ($element.position().top + frame.top) + 'px'); }
            if (frame.bottom != undefined) { $element.css('bottom', ($element.position().bottom + frame.bottom) + 'px'); }
            if (frame.left != undefined) { $element.css('left', ($element.position().left + frame.left) + 'px'); }
            if (frame.right != undefined) { $element.css('right', ($element.position().right + frame.right) + 'px'); }
            
            // onFrame callback
            if (typeof plugin.playhead.onFrame == 'function') {
                plugin.playhead.onFrame.call($element.data('spriteAnimator'));
            }
            
            // Trigger: frame
            //$element.trigger('frame');
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
            var _aboveTop =  ($(window).scrollTop() >= $element.offset().top + plugin.internal.frameHeight);
            var _belowFold = ($(window).height() + $(window).scrollTop() <= $element.offset().top);
            var _leftOfScreen = ($(window).scrollLeft() >= $element.offset().left + plugin.internal.frameWidth);
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
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
 
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());
