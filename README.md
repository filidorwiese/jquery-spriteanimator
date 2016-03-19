# Jquery spriteAnimator plugin

Create fancy sprite animations with this jQuery plugin

Demo's:
* [Looping animation](http://www.fili.nl/jquery-spriteanimator-examples/looping-animation-arcade.html)
* [Scripted animation 1](http://www.fili.nl/jquery-spriteanimator-examples/scripted-animation-ossy.html)
* [Scripted animation 2](http://www.fili.nl/jquery-spriteanimator-examples/scripted-animation-reading.html)

Also check out https://galaxy.fili.nl, an animating website fully based on this library. The source for it can be found [here](https://github.com/filidorwiese/galaxy.fili.nl)

### Simple looping animation example

![reading spritesheet](https://raw.githubusercontent.com/filidorwiese/jquery-spriteanimator/master/examples/sprites/reading.png)

Define a html-tag on the page and give it a sprite-sheet as the background-image. Then attach the spriteAnimator plugin on the jQuery wrapper, giving it some information about the sprite-sheet and where to put it on the page.
Finally call .play() on it with some optional parameters.

```js
<div id="sprite" style="background-image:url(reading.png)"></div>
<script>
     var spriteAnim = $('#sprite').spriteAnimator({
        top: 200,
        left: 100,
        cols: 3,
        rows: 9
    });
    spriteAnim.play({
        run: -1,
        delay: 100
    });
</script>
```

### .spriteAnimator( *Object* `options` )

When attaching the spriteAnimator plugin you can define the following options

Property | Required | Default&nbsp;value | Explanation
------------- |:-------------:| :-------------:| -------------
`debug` | no | false | Show debug logging in console
`url` | no | null | url to spriteSheet, if not set the css background-image will be used
`cols` | yes | null | Number of columns in the spritesheet
`rows` | yes | null | Number of rows in the spritesheet
`cutOffFrames` | no | 0 | Number of sprites not used in the spritesheet, for example the last sprite in a sheet might be blank
`top` `bottom` `left` `right` | no |  | Starting offset position, will take current positions if not defined
`startSprite` | no | 1 | Sprite number to show when done loading
`onLoaded` | no | null | Callback function that will be called when loading has finished

The spriteAnimator returns a reference to the plugin on which you can call the methods below.

### .addScript( *String* `name`, *Array* `script`)

Add a named animation sequence. The `script` parameter should be an array consisting of frame objects. These frame objects can have the following properties:


Property | Required | Default&nbsp;value | Explanation
------------- |:-------------:| :-------------:| -------------
`sprite` | yes |  | Which sprite number to show
`delay` | no | global delay time | Time in ms to wait after this frame has been rendered 
`top` `bottom` `left` `right` | no | 0 | Move the position of the placeholder to any direction after frame has been rendered

Example:
```js
spriteAnim.addScript('paw', [
    { sprite:22, delay:100 },
    { sprite:23, delay:100 },
    { sprite:24, delay:3000 },
    { sprite:23, delay:100 }
]);
```

### .play( *Object* `options` )
Plays a named animation sequence or resume if not playing. If no options object is given, it resumes the current animation script or starts playing all frames.

Property | Required | Default&nbsp;value | Explanation
------------- |:-------------:| :-------------:| -------------
`play` | no | true | Start playing the animation right away
`run` | no | 1 | The number of times the animation should run, -1 = infinite
`delay` | no | 50 | Default delay for all frames that don't have a delay set
`tempo` | no | 1 | Timescale for all delays, double-speed = 2, half-speed = .5
`reversed` | no | false | Direction of the animation head, true == backwards
`outOfViewStop` | no | false | Stop animation if placeholder is no longer in view
`script` | no | all frames | New animation array or named script that has been previously been defined, see `.addScript()`
`onPlay` | no |  | Callback called when animator starts playing
`onStop` | no | null | Callback called when animator stops playing
`onFrame` | no | null | Callback called when the new frame is rendered

### .setTempo( *Integer* `tempo` )

Set a new tempo for the animation

### .reverse()

Reverse direction of play

### .stop()

Stop the animation and reset the playhead

### .reset()

Reset playhead to first frame

### .nextFrame()

Go forward one frame in script

### .previousFrame()

Go back one frame in script

### .goToFrame( *Integer* `frameNumber` )

Jump to certain frame within current animation sequence

### .showSprite( *Integer* spriteNumber )

Show certain sprite (circumvents the current animation sequence)

### .currentFrame()

Get the current frameNumber from script

### .currentSprite()

Get the current spriteNumber that is shown

### Controlling playback using jQuery events

The built-in jQuery [.trigger()](http://api.jquery.com/trigger/) method can be used to trigger the following methods:

* play()
* reverse()
* setTempo()
* stop()
* reset()
* nextFrame()
* previousFrame()
* goToFrame()
* showSprite()

This allows for some advanced interaction between multiple sprite animations to take place, for example:

```js

var spriteAnim1 = $('#sprite1').spriteAnimator({
    cols: 3,
    rows: 9
});

var spriteAnim2 = $('#sprite2').spriteAnimator({
    cols: 3,
    rows: 9
});

spriteAnim1.trigger('play', {
    run: 3,
    script: [
        { sprite:1 },
        { sprite:2 },
        { sprite:3, delay:350} ,
        { sprite:4 }
    ],
    onStop: function() {
        spriteAnim2.trigger('play');
    }
});

```

In this example sprite1 will trigger play() on sprite2 after it's animation has been completed.

### License

The artwork in this repository is licensed under a [Creative Commons Attribution-NonCommercial 4.0 International License](http://creativecommons.org/licenses/by-nc/4.0/).

Meaning you are free to:

* Share — copy and redistribute the material in any medium or format
* Adapt — remix, transform, and build upon the material

Under the following terms:

* Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
* NonCommercial — You may not use the material for commercial purposes.
