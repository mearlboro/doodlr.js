////////////////////////////////////////////////////////////////////////////////////////////////////////

// COLOUR LIBRARY
// colour conversions adapted from http://en.wikipedia.org/wiki/HSL_color_space.
var Color = {
  rgbToHex : function(r, g, b) {
    return ("#" + ((r << 16) | (g << 8) | b).toString(16));
  },

  hexToRgb : function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
  },

  rgbToHsl : function(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h, s, l;

    // luminance is average of brightest and darkest       
    l = (max + min) / 2; 

    // calculate the hue
    if (max == min) {
      h = s = 0; // achromatic
    } 
    else {
      var dif = max - min;
      s = l > 0.5 
        ? dif / (2 - max - min) 
        : dif / (max + min); // saturation given by range of intensity 

      // hue is given by dominant
      switch (max) {
          case r: h = (g - b) / dif + (g < b ? 6 : 0); break;
          case g: h = (b - r) / dif + 2;               break;
          case b: h = (r - g) / dif + 4;               break;
      }
      h /= 6;
    }

    return ({ h: h, s: s, l: l });
  },

  hslToRgb : function(h, s, l) {
    var r, g, b;

    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5  // first find chroma 
            ? l * (1 + s)  
            : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return ({
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    });
  },

  hueToRgb : function(p, q, t) {  // based on HSL to RGB formula
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
}
  

// DISTANCE LIBRARY
var Dist = {
  distance : function(point1, point2) {
    var dx = point1.x - point2.x; 
        dy = point1.y - point2.y;
    return parseInt(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));
  },
  angle : function(point1, point2) {
    var dx = point1.x - point2.x, 
        dy = point1.y - point2.y;
    return Math.atan2(dx, dy);
  } 
} 


////////////////////////////////////////////////////////////////////////////////////////////////////////

// DRAWING LIBRARY
// Object with all the editor data
var Editor = {
  // canvas
  can: null,
  ctx: null,
  w:   0,
  h:   0,

  // tools and their parameters
  tool:    "pencil",    // default tool

  pencilTexture: null, 
  pencilSize:    2,
  brushTexture:  null,
  brushSize:     100, 
  brushOpacity:  0.5,
  lineSize:      2,
  rectSize:      2,
 
  color:   "#000000",

  // flag used to detect mousedown + mousemove for drawing
  flag: false,

  // "point" types for mouse coordinates
  prev: { x:0, y:0 },
  curr: { x:0, y:0 },


  //
  //
  // INITIALISE AND SETTERS /////////////
  canvasInit: function(canvasObject) {
    this.can = canvasObject; 
    this.ctx = this.can.getContext('2d');
    this.w = this.can.width;
    this.h = this.can.height;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.w, this.h);

    this.setPencilTexture(null);
    this.setBrushTexture("/brush1.png");
  },

  setTool: function(toolName) {
    this.tool = toolName;
    console.log("chose " + this.tool + " tool.");
  },

  setPencilTexture: function(textureUrl) {
    if(textureUrl != null) {
      this.pencilTexture = new Image();
      this.pencilTexture.src = textureUrl;
      this.pencilTexture.setAttribute('crossOrigin', 'anonymous');
    }
    else this.pencilTexture = null;
    console.log("pencil texture updated" + textureUrl);
  },
  setPencilSize: function(pencilSize) {
    this.pencilSize = pencilSize;
  },
  setBrushTexture: function(textureUrl) {
    this.brushTexture = new Image();
    this.brushTexture.src = textureUrl;
    this.brushTexture.setAttribute('crossOrigin', 'anonymous');
  },
  setBrushSize: function(brushSize) {
    this.brushSize = brushSize;
  },
  setBrushOpacity: function(brushOpacity) {
    this.brushOpacity = brushOpacity;
  },
  setLineSize: function(lineSize) {
    this.lineSize = lineSize;
  },
  setRectSize: function(rectSize) {
    this.rectSize = rectSize;
  },

  setColor: function(c) { this.color = c; },
  setSize:  function(s) { this.size  = s; },
  setFlag:  function(f) { this.flag  = f; },

  //
  //
  // MOUSE EVENTS ////////////////////////
  refreshCoordinates: function(e) {
    this.prev.x = this.curr.x;
    this.prev.y = this.curr.y;
    this.curr.x = e.clientX + document.body.scrollLeft;
    this.curr.y = e.clientY + document.body.scrollTop;
  },


  //
  //
  // TOOLS BEHAVIOUR //////////////

  //
  // Eyedropper tool
  chooseColor: function(colorPicker) {
    // Get the pixel's color
    var p   = this.ctx.getImageData(this.curr.x, this.curr.y, 1, 1).data;
    var hex = Color.rgbToHex(p[0], p[1], p[2]);
    // Set the color picker to that color
    colorPicker.spectrum("set", hex);
    this.setColor(hex);
  },

  //
  // Select tool
  // adds a pseudo div element (which is the select area)
  // to the div element underneath the canvas 
  selectStartX: 0, 
  selectStartY: 0,
  selectarea: null,

  selectDrawPath: function() {
    var x  = this.curr.x,       y = this.curr.y,
        x0 = this.selectStartX, y0 = this.selectStartY;
    if (this.selectarea !== null) {
      this.selectarea.style.width  = Math.abs(x - x0) + 'px' ;
      this.selectarea.style.height = Math.abs(y - y0) + 'px' ;
      this.selectarea.style.left   = (x - x0 < 0) ? x + 'px' : x0 + 'px';
      this.selectarea.style.top    = (y - y0 < 0) ? y + 'px' : y0 + 'px';
    }
  },
  selectStartEndPath: function(wrapperObject) {
    var x = this.curr.x, y = this.curr.y;

    if(this.selectarea != null) {
      console.log("end selection at (" + x + ", " + y + ")"); 
      this.selectarea = null;
      this.can.style.cursor = "default";
    }
    else {
      // initialise selection
      this.selectStartX = x;
      this.selectStartY = y;
      console.log("begin selection at (" + x + ", " + y + ")"); 
      this.selectarea = document.createElement('div');
      this.selectarea.className = 'selectarea';
      this.selectarea.style.left = x + 'px'; 
      this.selectarea.style.top = y + 'px';

      console.log(wrapperObject);
      wrapperObject.appendChild(this.selectarea);
      this.can.style.cursor = "crosshair";
    }
  },

  //
  // pencil
  drawDot: function() {
    if(this.pencilTexture == null) {
      this.drawDefaultPencilDot(this.pencilSize, this.color);
    }
    else {
      this.drawTextureDot(this.pencilSize, this.pencilTexture, 1, this.color); 
    }
  },
  drawLine: function() {
    if(this.pencilTexture == null) {
      this.drawDefaultPencilLine(this.pencilSize, this.color);
    }
    else {
      this.drawTextureLine(this.pencilSize, this.pencilTexture, 0.5, this.color); 
    }
  },

  //
  // brush
  drawSingleStroke: function() {
    this.drawTextureDot(this.brushSize, this.brushTexture, this.brushOpacity,  this.color); 
  },
  drawStroke: function() {
    this.drawTextureLine(this.brushSize, this.brushTexture, this.brushOpacity, this.color); // TODO: smoothing opacity when stroking 
  },

  // DRAWING HELPERS + NON-DEXTURE DRAWING
  drawDefaultPencilDot: function(size, color) {
    this.ctx.beginPath();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.curr.x, this.curr.y, size, size);
    this.ctx.closePath();
  },
  drawDefaultPencilLine: function(size, color) {
    this.ctx.beginPath();

    this.ctx.moveTo(this.prev.x, this.prev.y);
    this.ctx.lineTo(this.curr.x, this.curr.y);
    this.ctx.lineWidth   = size;
    this.ctx.strokeStyle = color;

    this.ctx.stroke();
    this.ctx.closePath();
  },

  //
  // shape line
  drawShapeLine1: function() { // TODO: change names
    this.drawShapeLineStartEnd(this.lineSize, this.color);
  },
  drawShapeLine2: function() { 
    this.drawShapeLineMove(this.lineSize, this.color);
  },

  // drawing helper
  drawTextureDot: function(size, texture, opacity, color) {
    // update the brush with user parameters
    var brush = this.setTexture(size, texture, opacity, color);
 
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.drawImage(brush, this.curr.x - brush.width/2, this.curr.y - brush.height/2);
    this.ctx.restore();
  },
  drawTextureLine: function(size, texture, opacity, color) {
    // update the brush with user parameters
    var brush = this.setTexture(size, texture, opacity, color);

    var dist  = Dist.distance(this.prev, this.curr);
    var alpha = Dist.angle(this.prev, this.curr);
    var x, y;

    var frame = size > 5 ? Math.ceil(size/4) : 0.5;
    for(var i = 0; (i <= dist || i == 0); i+=frame) {
      x = this.prev.x + (Math.sin(alpha) * i) - brush.width/2;
      y = this.prev.y + (Math.cos(alpha) * i) - brush.height/2;
      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.drawImage(brush, x, y);
      this.ctx.restore();
    }
  },
  setTexture: function(size, texture, opacity, color) {
    texture.setAttribute('crossOrigin', 'anonymous'); // for safety
    var h = texture.height, w = texture.width;
    var scale = size / Math.max(w, h); 
    // create a ghost canvas which is not added to the page, for manipulating the image
    var bcanvas = document.createElement('canvas');
    var bctx = bcanvas.getContext('2d');
    bcanvas.width = w * scale, bcanvas.height = h * scale;

    // scale
    bctx.drawImage(texture, 0, 0, w * scale, h * scale);
    var imgdata = bctx.getImageData(0, 0, w * scale, h * scale);
    // change colors
    var rgba = imgdata.data;
    var rgb  = Color.hexToRgb(color);
    for (var px = 0; px < rgba.length; px += 4) { 
      rgba[px  ] = rgb.r;
      rgba[px+1] = rgb.g;
      rgba[px+2] = rgb.b;
    }
    bctx.putImageData(imgdata, 0, 0);
    return bcanvas;  
  },

  lines: [],
  currentLine: 0,
  // SHAPE HELPERS /// TODO... mate refactor this wtf...
  drawShapeLineStartEnd: function(size, color) {
    if(this.lines[this.currentLine] == null) {
      var line = { start: { x: this.curr.x, y: this.curr.y },  
                   end  : { x: 0          , y: 0           } };
      this.lines.push(line);
    }
    else {
      this.lines[this.currentLine].end = { x: this.curr.x, y: this.curr.y }; 
      this.ctx.beginPath();
      this.ctx.moveTo(this.lines[this.currentLine].start.x, this.lines[this.currentLine].start.y);
      this.ctx.lineTo(this.lines[this.currentLine].end.x,   this.lines[this.currentLine].end.y);
      this.ctx.lineWidth = size;
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
      console.log(this.lines[this.currentLine]);
      this.currentLine++;
    }

  },
  drawShapeLineMove: function(width) {
    console.log("imma moven"); 
  } 

}

////////////////////////////////////////////////////////////////////////////////////////////////////////

if(Meteor.isClient) {
  // Brick parameters
  var row, col;


  // Canvas 
  Template.canvas.onRendered(function () {
    // prepare the canvas
    canvas = this.find('#canvas');
    Editor.canvasInit(canvas);
    loadImage(Editor.ctx);
 
    // init the color picker
    $("#colorpicker").spectrum({
      color: "#000",
      showInput: true,
      className: "full-spectrum",
      showPalette: false,
      showSelectionPalette: true,
      maxSelectionSize: 10,
      preferredFormat: "hex",
      localStorageKey: "spectrum.homepage",
      change: function(c) {
        Editor.setColor(c.toHexString());
      },
    });
  });


  //
  // Events 
  Template.canvas.events({
    // Events for choosing tools
    'click #select'    : function() {
      Editor.setTool("select");
    },
    'click #pencil'    : function() {
      Editor.setTool("pencil");
    },
    'click #brush'     : function() {
      Editor.setTool("brush");
    },
    'click #line'      : function() {
      Editor.setTool("line");
    },
    'click #rectangle' : function() {
      Editor.setTool("rectangle");
    },
    'click #eyedrop'   : function() {
      Editor.setTool("eyedrop");
    },

    // pop-up and down the properties for each tool, ontool
    'dblclick #canvas': function(e, template) {
      var all = template.findAll('.prop');
      removeAllMenus(all); // remove all for safety
      
      var menu;
      if(Editor.tool == "pencil") {
        menu = template.find('#pencil-prop');
      }
      if(Editor.tool == "brush") {
        menu = template.find('#brush-prop');
      }
      if(Editor.tool == "line") {
        menu = template.find('#line-prop');
      }
      if(Editor.tool == "rectangle") {
        menu = template.find('#rect-prop');
      }
      var popupX = Math.min(window.innerWidth  - 280, e.clientX); // TODO: menu.width not working?
      var popupY = Math.min(window.innerHeight - 180, e.clientY);
      menu.style.left = popupX + 'px';
      menu.style.top = popupY + 'px';
      menu.style.display = "block";
    }, 
    'click #canvas': function(e, template) {
      var all = template.findAll('.prop');
      removeAllMenus(all);
    },

    // Mouse events for drawing
    'mousedown #canvas': function(e) {
      handleDown(e);
    },
    'mouseup #canvas': function(e) {
      handleUp(e);
    },
    'mousemove #canvas': function(e) {
      handleMove(e);
    },
    'mouseout #canvas': function(e) {
      handleUp(e);
    },

    // Event to save canvas content
    'click .save-button': function(e) {
      saveImage(e, row, col);
    }
   });

   removeAllMenus = function(all) {
      all.forEach(function(elem) {
        elem.style.display = "none";
      });
   } 

  // arrays of pencil and brush textures
  var pencilTextures = [ '/pencil0.png', '/pencil1.png', '/pencil2.png'  ];
  var brushTextures  = [ '/brush0.png', '/brush1.png', '/brush2.png', '/brush3.png', '/brush4.png' ];
  // load pencil the textures into their elements
  Template.PencilProperties.helpers({
    pencilTextures: function() {
      var textures = [];
      for(var i = 0; i < pencilTextures.length; i++) {
        var id = 'pencil' + i;
        textures.push({ id: id, image: pencilTextures[i] });
      }
      return textures;
    }
  });
  // load the brush textures into their elements
  Template.BrushProperties.helpers({
    brushTextures: function() {
      var textures = [];
      for(var i = 0; i < brushTextures.length; i++) {
        var id = 'brush' + i;
        textures.push({ id: id, image: brushTextures[i] });
      }
      return textures;
    }
  });

  // pencil properties: texture, size
  Template.PencilProperties.events({
    // pencil change texture
    'click #pencil0': function(e, template) {
      var allTextures = template.findAll('.pencilTexture');
      var textureImg  = template.find('#pencil0');
      updateTexture(allTextures, textureImg, 0, "pencil");
    },
    'click #pencil1': function(e, template) {
      var allTextures = template.findAll('.pencilTexture');
      var textureImg  = template.find('#pencil1');
      updateTexture(allTextures, textureImg, 1, "pencil");
    },
    'click #pencil2': function(e, template) {
      var allTextures = template.findAll('.pencilTexture');
      var textureImg  = template.find('#pencil2');
      updateTexture(allTextures, textureImg, 2, "pencil");
    },
    // pencil change width
    'change #pencil-width': function(e, template) {
      var size = template.find('#pencil-width').value;
      var textField = template.find('#pencil-width-field');
      textField.value = size;
      Editor.setPencilSize(size);
      console.log("set pencil size " + size);
    },
    'change #pencil-width-field': function(e, template) {
      var slider = template.find('#pencil-width');
      var size = template.find('#pencil-width-field').value;
      if (size < 1 || size > 4) {
        console.log("invalid pencil size");  // TODO: add some visual error
      }
      else {
        slider.value = size;
        Editor.setPencilSize(size);
        console.log("set pencil size " + size);
      }
    },
    
  });
  // brush properties: texture, size, opacity
  Template.BrushProperties.events({
    // brush change texture
    'click #brush0': function(e, template) {
      var allTextures = template.findAll('.brushTexture');
      var textureImg  = template.find('#brush0');
      updateTexture(allTextures, textureImg, 0, "brush");
    },
    'click #brush1': function(e, template) {
      var allTextures = template.findAll('.brushTexture');
      var textureImg  = template.find('#brush1');
      updateTexture(allTextures, textureImg, 1, "brush");
    },
    'click #brush2': function(e, template) {
      var allTextures = template.findAll('.brushTexture');
      var textureImg  = template.find('#brush2');
      updateTexture(allTextures, textureImg, 2, "brush");
    },
    'click #brush3': function(e, template) {
      var allTextures = template.findAll('.brushTexture');
      var textureImg  = template.find('#brush3');
      updateTexture(allTextures, textureImg, 3, "brush");
    },
    'click #brush4': function(e, template) {
      var allTextures = template.findAll('.brushTexture');
      var textureImg  = template.find('#brush4');
      updateTexture(allTextures, textureImg, 4, "brush");
    },
    // brush change width
    'change #brush-width': function(e, template) {
      var size = template.find('#brush-width').value;
      var textField = template.find('#brush-width-field');
      textField.value = size;
      Editor.setBrushSize(size);
      console.log("set brush size " + size);
    },
    'change #brush-width-field': function(e, template) {
      var slider = template.find('#brush-width');
      var size = template.find('#brush-width-field').value;
      if (size < 1 || size > 4) {
        console.log("invalid brush size");  // TODO: add some visual error
      }
      else {
        slider.value = size;
        Editor.setBrushSize(size);
        console.log("set brush size " + size);
      }
    },
    // brush change opacity
    'change #brush-opacity': function(e, template) {
      var opacity = template.find('#brush-opacity').value/100;
      var textField = template.find('#brush-opacity-field');
      textField.value = opacity;
      Editor.setBrushOpacity(opacity);
      console.log("set brush opacity " + opacity);
    },
    'change #brush-opacity-field': function(e, template) {
      var slider = template.find('#brush-opacity');
      var opacity = template.find('#brush-opacity-field').value;
      if (opacity < 0 || opacity > 1) {
        console.log("invalid brush opacity");  // TODO: add some visual error
      }
      else {
        slider.value = opacity * 100;
        Editor.setBrushOpacity(opacity);
        console.log("set brush opacity " + opacity);
      }
    },
  });
  // line properties: width 
  Template.LineProperties.events({
    // line change width
    'change #line-width': function(e, template) {
      var width = template.find('#line-width').value;
      var textField = template.find('#line-width-field');
      textField.value = width;
      Editor.setLineSize(width);
      console.log("set line width " + width);
    },
    'change #line-width-field': function(e, template) {
      var slider = template.find('#line-width');
      var width = template.find('#line-width-field').value;
      if (width < 1 || width > 500) {
        console.log("invalid line width");  // TODO: add some visual error
      }
      else {
        Editor.setLineOpacity(width);
        console.log("set line width " + width);
      }
    },
  });
  // rectangle properties: width 
  Template.RectProperties.events({
    // rectangle change width
    'change #rect-width': function(e, template) {
      var width = template.find('#rect-width').value;
      var textField = template.find('rect-width-field');
      textField.value = width;
      Editor.setRectSize(width);
      console.log("set rect width " + width);
    },
    'change #rect-width-field': function(e, template) {
      var slider = template.find('#rect-width');
      var width = template.find('#rect-width-field').value;
      if (width < 1 || width > 500) {
        console.log("invalid rect width");  // TODO: add some visual error
      }
      else {
        Editor.setRectOpacity(width);
        console.log("set rect width " + width);
      }
    },
  });

  // helper to update texture for brush and pencil 
  updateTexture = function(all, selected, i, tool) {
    all.forEach(function(elem) {
      elem.style.border = "0";
    });
    selected.style.border = "1.5px solid yellow";
    if(tool == "pencil") {
      if(i == 0) {
        console.log(i);
        Editor.setPencilTexture(null);
      }
      else {
        Editor.setPencilTexture(pencilTextures[i]);
      }
    }
    if(tool == "brush")  Editor.setBrushTexture(brushTextures[i]);
  }


  //
  // Mouse event handlers
  handleDown = function(e) {
    Editor.refreshCoordinates(e);

    if(Editor.tool == "select") {  
      Editor.selectStartEndPath(document.getElementById("canvas-wrapper")); 
    }
    Editor.setFlag(true);  // on mouse down, start drawing
    if(Editor.flag) {
      if(Editor.tool == "pencil") {
        Editor.drawDot();
      }
      if(Editor.tool == "brush") {
        Editor.drawSingleStroke();
      }
      if(Editor.tool == "line") {
        Editor.drawShapeLine1();
      }
      if(Editor.tool == "shape") {
        Editor.shapeStartPath();
      }
    }
    if(Editor.tool == "eyedrop") {
      Editor.chooseColor($("#colorpicker"));
    }
  }
  handleMove = function(e) {
    Editor.refreshCoordinates(e);

    if(Editor.tool == "select") {
        Editor.selectDrawPath();
    }
    if(Editor.tool == "line") {
        Editor.drawShapeLine2();
    }
    if(Editor.flag) {   // keep drawing on mouse move as long as mouse is down
      if(Editor.tool == "pencil") {
        Editor.drawLine();
      }
      if(Editor.tool == "brush") {
        Editor.drawStroke();
      }
      if(Editor.tool == "shape") {
        Editor.shapeDrawPath();
      }
    }
  }
  handleUp = function(e) {
    Editor.setFlag(false);  // mouse up, stop drawing
  }


}

////////////////////////////////////////////////////////////////////////////////////////////////////////
Parse.initialize("9QOijSH3c8VZ4OMuXSNtcyZ9DOlNCttX9iMsv1GL", "mbIy8g11RvZG6c2hoZ9IHumiEGszjWyACcaOcsHg");

// Load Image from Parse
loadImage = function(ctx) {
  var url = window.location.href;
  var rowIndex = url.indexOf("x") + 1;
  var colIndex = url.indexOf("y") + 1;
  
  row = +url.slice(rowIndex, colIndex - 1);
  col = +url.slice(colIndex, url.length);
  console.log("Loading brick at location " + row + ", " + col);

  var brick = Parse.Object.extend("Brick");
  var query = new Parse.Query(brick);
  query.equalTo("row", row);
  query.equalTo("column", col);

  query.first({
    success: function(brick) {
      if(brick != undefined) {
        var image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.onload = function() {
          ctx.drawImage(image, 0, 0);
        };
        image.src =  brick.get("image")._url;
      }
    },
    error: function(error) {
      // It's just a clean canvas!
    }
  });
}

// Save Image to Parse
saveImage = function(e, row, col) {
  // First get the image
  var imageData = canvas.toDataURL();
  var imageBase64 = imageData.replace(/^data:image\/(png|jpg);base64,/, ""); //magic, do not touch
  var image = new Parse.File("drawing.png", {base64: imageBase64});

  // try to query for a brick
  var brick = Parse.Object.extend("Brick");
  var query = new Parse.Query(brick);
  query.equalTo("row", row);
  query.equalTo("column", col);


  query.first({
    success: function(brick) {
      // finds a brick, thus updates the curr one
      if(brick != undefined) {
        brick.set("image", image);

        brick.save().then(function() {
          console.log("Successfuly saved brick (" + row + ", " + col + ") to Parse");
        }, function(error) {
          console.log("Error saving to Parse");
        });
      }
      // it's a new drawing! create a brick
      else {
        var newBrick = new Parse.Object("Brick");
        newBrick.set("row", row);
        newBrick.set("column", col);
        newBrick.set("image", image);
        newBrick.save().then(function() {
          console.log("Successfuly saved brick (" + row + ", " + col + ") to Parse");
        }, function(error) {
          alert("Error saving to parse");
        });
      }
    },
    error: function(error) {
      console.log("Parse retrieval error");
    }
  });
}






