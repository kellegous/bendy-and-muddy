/// <reference path="lib/jquery.d.ts" />
/// <reference path="lib/raf.ts" />
module app {

interface Flip {
  progress : number;
  target : number;
  page : JQuery;

  time : number;
}

var flipIsFlipped = function(flip : Flip) : boolean {
  return flip.progress < 0.997;
}

var flipGoto = function(flip : Flip, target : number) {
  flip.target = target;
  flip.time = Date.now();
};

var $e = function(name : string) {
  return $(document.createElement(name));
};

var animationEnd = 'webkitAnimationEnd mozAnimationEnd msAnimationEnd oAnimationEnd animationend';

var BOOK_WIDTH = 830 * 2,
    BOOK_HEIGHT = 520,
    PAGE_WIDTH = 800,
    PAGE_HEIGHT = 500,
    PAGE_Y = (BOOK_HEIGHT - PAGE_HEIGHT) / 2,
    CANVAS_PADDING_X = 20,
    CANVAS_PADDING_Y = 80;

var canvas = <HTMLCanvasElement>document.getElementById('flip'),
    context = canvas.getContext('2d');

var book = $('#book'),

    // elements for each page
    pages = $('section', book),

    // index of the current page
    index = 0,

    // total number of pages
    count = pages.length,

    // is the cover open?
    isOpen = false,

    // paint loop is active
    painting = false,

    // do not allow open/close when the cover is already in motion
    coverInMotion = false,

    // a callback for when pages flip or cover opens
    pageDidChange = () => {},

    // flip state objects for each page
    flips = $.map(pages, (page, i) => {
      var e = $(page).css('z-index', count - i)
          .append($e('span').addClass('num').text(i+1));
      return <Flip>{
        progress: 1,
        target:   1,
        page:     e
      };
    }),

    // element for the front cover
    cover = $('#rcover'),

    // the little shadow under the front-cover
    shadow = $('#rcover-shadow'),

    // the book shadow
    bookShadow = $('#book-shadow'),

    // the little stack of paper on the side
    stacks = $('#stack>div');

// Setup event listeners
var bind = function() {
  pageDidChange = () => {
    nextButton.prop('disabled', index == count);
    prevButton.prop('disabled', !isOpen);
    closButton.prop('disabled', !isOpen);
  };

  // Ctrl-0 closes up the book.
  document.addEventListener('keydown', (e : KeyboardEvent) => {
    if (e.ctrlKey && !e.shiftKey && e.keyCode == 48 /* 0 */) {
      close();
    }
  }, true);

  // Clicking on the cover opens it.
  $('#rcover').on('click', open);

  // Interactions with pages.
  $('#rpages').on('click',next)
    .on('mouseover', (e) => {
      peek(true);
    })
    .on('mouseout', (e) => {
      peek(false);
    });

  var nextButton = $('#next').on('click', next);

  var prevButton = $('#prev').on('click', prev);

  var closButton = $('#clos').on('click', close);

  // Arrow provide next/prev.
  document.addEventListener('keydown', (e : KeyboardEvent) => {
    if (e.keyCode == 39 /* right */) {
      next();
    } else if (e.keyCode == 37 /* left */) {
      prev();
    }
  }, true);
};

var init = function() {
  $(canvas).attr('width', BOOK_WIDTH + CANVAS_PADDING_X * 2)
    .attr('height', BOOK_HEIGHT + CANVAS_PADDING_Y * 2)
    .css('top', -CANVAS_PADDING_Y)
    .css('left', -CANVAS_PADDING_X);

  setTimeout(() => {
    $('#book').fadeIn(1000);
  }, 0);
};

var drawPageFlip = function(context : CanvasRenderingContext2D, flip : Flip) {
      // Strength of the fold is strongest in the middle of the book
  var strength = 1 - Math.abs(flip.progress),
      // width of folded paper
      foldWidth = (PAGE_WIDTH * 0.5) * (1 - flip.progress),
      // X position of folded paper
      foldX = PAGE_WIDTH * flip.progress + foldWidth,
      // how far the page should outdent due to perspective
      verticalOutdent = CANVAS_PADDING_Y * strength,
      paperShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(1 - flip.progress, 0.5), 0),
      rightShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(strength, 0.5), 0),
      leftShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(strength, 0.5), 0);

    // Change page element width to match the x position of the fold
    flip.page.css('width', Math.max(foldX, 0));

    context.save();
    context.translate(CANVAS_PADDING_X + (BOOK_WIDTH / 2),
      PAGE_Y + CANVAS_PADDING_Y);

    // Draw a sharp shadow on the left side of the page
    context.strokeStyle = 'rgba(0,0,0,' + (0.1 * strength) + ')';
    context.lineWidth = 30 * strength;
    context.beginPath();
    context.moveTo(foldX - foldWidth, -verticalOutdent * 0.5);
    context.lineTo(foldX - foldWidth, PAGE_HEIGHT + (verticalOutdent * 0.5));
    context.stroke();

    // Right side drop shadow
    var rightShadowGradient = context.createLinearGradient(foldX, 0, foldX + rightShadowWidth, 0);
    rightShadowGradient.addColorStop(0, 'rgba(0,0,0,' + (strength*0.2)+')');
    rightShadowGradient.addColorStop(0.8, 'rgba(0,0,0,0.0)');

    context.fillStyle = rightShadowGradient;
    context.beginPath();
    context.moveTo(foldX, 0);
    context.lineTo(foldX + rightShadowWidth, 0);
    context.lineTo(foldX + rightShadowWidth, PAGE_HEIGHT);
    context.lineTo(foldX, PAGE_HEIGHT);
    context.fill();

    // Left side drop shadow
    var leftShadowGradient = context.createLinearGradient(
      foldX - foldWidth - leftShadowWidth, 0, foldX - foldWidth, 0);
    leftShadowGradient.addColorStop(0, 'rgba(0,0,0,0.0)');
    leftShadowGradient.addColorStop(1, 'rgba(0,0,0,'+(strength*0.15)+')');

    context.fillStyle = leftShadowGradient;
    context.beginPath();
    context.moveTo(foldX - foldWidth - leftShadowWidth, 0);
    context.lineTo(foldX - foldWidth, 0);
    context.lineTo(foldX - foldWidth, PAGE_HEIGHT);
    context.lineTo(foldX - foldWidth - leftShadowWidth, PAGE_HEIGHT);
    context.fill();

    var foldGradient = context.createLinearGradient(foldX - paperShadowWidth, 0, foldX, 0);
    foldGradient.addColorStop(0.35, '#fafafa');
    foldGradient.addColorStop(0.73, '#eeeeee');
    foldGradient.addColorStop(0.9,  '#fafafa');
    foldGradient.addColorStop(1.0,  '#e2e2e2');

    context.fillStyle = foldGradient;
    context.strokeStyle = 'rgba(0,0,0,0.06)';
    context.lineWidth = 0.5;

    // Draw the folded piece of paper
    context.beginPath();
    context.moveTo(foldX, 0);
    context.lineTo(foldX, PAGE_HEIGHT);
    context.quadraticCurveTo(foldX, PAGE_HEIGHT + (verticalOutdent * 1.9),
      foldX - foldWidth,
      PAGE_HEIGHT + verticalOutdent);
    context.lineTo(foldX - foldWidth, -verticalOutdent);
    context.quadraticCurveTo(foldX, -verticalOutdent * 1.9, foldX, 0);
    context.fill();
    context.stroke();

    context.restore();
};

var render = function(t : number) {
  var now = Date.now(),
      // moving means it is still trying to reach a target
      moving = flips.filter((f) => {
        return Math.abs(f.target - f.progress) > 0.0031;
      }),
      // undocked means that it is either moving or not at
      // one of the ends.
      undocked = flips.filter((f) => {
        return Math.abs(f.target - f.progress) > 0.0031
            || Math.abs(f.progress) < 0.9969;
      });

  context.clearRect(0, 0, canvas.width, canvas.height);

  undocked.forEach((flip) => {
    // This is a hack to correct for low frame rate situations. Ideally this
    // would be purely time-based but instead I roughly correct for missed frames
    // by looking at the time between updates.
    var f = ((now - flip.time) / 20) | 0;
    while (f-- >= 0) {
      flip.progress += (flip.target - flip.progress) * 0.08;
      flip.progress = Math.max(-0.997, Math.min(0.997, flip.progress));
    }
    flip.time = now;
    drawPageFlip(context, flip);
  });

  if (moving.length > 0) {
    requestAnimationFrame(render);
    return;
  }

  painting = false;
};

var _startPaints = function() {
  if (painting) {
    return;
  }

  painting = true;
  requestAnimationFrame(render);
};

var _updateStack = function() {
  var p = 1 - index / count,
      c = p * stacks.length;
  stacks.each((i, e) => {
    $(e).css('opacity', i < c ? 1 : 0);
  });
};

var peek = function(state : boolean) {
  if (index >= count) {
    return;
  }

  _startPaints();
  flipGoto(flips[index], state ? 0.95 : 1);
};

var next = function() {
  if (!isOpen || coverInMotion) {
    open();
    return;
  }

  if (index >= count) {
    return;
  }

  _startPaints();
  flipGoto(flips[index], -1);
  index++;
  _updateStack();
  pageDidChange();
};

var prev = function() {
  if (!isOpen || coverInMotion) {
    return;
  }

  if (index == 0) {
    close();
    return;
  }

  _startPaints();
  index--;
  flipGoto(flips[index], 1);
  _updateStack();
  pageDidChange();
};

// Opens the cover of the book and enables the first page.
var open = function() {
  if (isOpen || coverInMotion) {
    return;
  }

  var c = cover,
      l = $('#lpages'),
      s = $('#rcover-shadow');
  
  var didEnd = function(e : Event) {
    l.show();
    c.removeClass('flipped')
      .hide()
      .off(animationEnd, didEnd);
    s.removeClass('flipped')
      .hide();
    coverInMotion = false;
  };

  isOpen = true;
  coverInMotion = true;
  c.addClass('flipped')
    .on(animationEnd, didEnd);
  s.addClass('flipped');
  // TODO(knorton): 1.2s is encoded in the stylesheet but I need to
  // start expanding the shadow midway through.
  setTimeout(() => {
    bookShadow.addClass('open');
  }, 500);

  pageDidChange();
};


// Closes all pages of the book and then the cover.
var close = function() {
  if (!isOpen || coverInMotion) {
    return;
  }

  var c = cover,
      s = $('#rcover-shadow'),
      l = $('#lpages');

  var didEnd = function(e : Event) {
    c.removeClass('flipped')
      .removeClass('reversed')
      .off(animationEnd, didEnd);
    s.removeClass('flipped')
      .removeClass('reversed');

    _startPaints();
    flips.forEach((flip) => {
      flipGoto(flip, 1);
      flip.progress = 0.95;
    });

    _updateStack();
    coverInMotion = false;
  };

  // reset page index
  index = 0;
  isOpen = false;
  coverInMotion = true;

  // schedule the closing of the cover
  c.show()
    .addClass('reversed')
    .addClass('flipped')
    .on(animationEnd, didEnd);
  s.show()
    .addClass('flipped')
    .addClass('reversed');
  l.hide();
  bookShadow.removeClass('open');

  pageDidChange();
};

bind();
init();

// add some styled elements
$('section .img').each((i, e) => {
  $e('div').addClass('tul').appendTo(e);
  $e('div').addClass('tlr').appendTo(e);
});

}