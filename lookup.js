const options = ({
    highlightedClassName: 'highlighted_selection',
    styles: {
        display: 'inline',
        backgroundColor: 'yellow'
    },
    description_length: 600,
    panelCss:{
        'border':'1px solid #e3e3e3',
        'line-height':0,
        'overflow':'hidden',
        'padding':'2px',
        'margin':0,
        'position':'absolute',
        'z-index':2147483647,
        'border-radius':'3px',
        'box-shadow':'3px 3px 9px 5px rgba(0,0,0,0.33)'
    },
    occurrenceRegex: function (selectionString) {
        return new RegExp(selectionString, 'i');
    },
    trimRegex: function () {
        // leading, selectionString, trailing
        // trim parts maintained for offset analysis
        return /^(\s*)(\S+(?:\s+\S+)*)(\s*)$/;
    },
    isSelectionValid: function ({ selectionString, selection }) {
        return (selectionString.length == 5 && /\w\d{4}/.exec(selectionString) && !/None|Caret/.exec(selection.type));
    }
});

chrome.storage.sync.get('optionsText', e => {
    if (e.optionsText) {
      try {
        const userOptions = eval(e.optionsText);
        Object.entries(userOptions).forEach(([key, value]) => {
          options[key] = value;
        });
      } catch (e) { console.error('Error parsing Selection Highlighter options.\n\n',e); }
    }
    chrome.storage.sync.get('mitre_attack_extension', e => { 
        if (e.mitre_attack_extension) {
            if (e.mitre_attack_extension == 'disabled') {
               return;
            }
            if (e.mitre_attack_extension == 'enabled') {
                var href = window.location.href;
                $('<div id="technique_content"></div>').appendTo(document.body);
                hide_pane();
                if (/docs\.google\.com/.exec(href)) {
                    initialize_docs();
                } else {
                    initialize();
                }
            }
        }
    });
});

document.addEventListener('mousemove', onMouseUpdate, false);
document.addEventListener('mouseenter', onMouseUpdate, false);
    
function onMouseUpdate(e) {
  x = e.pageX;
  y = e.pageY;
}

function getMouseX() {
  return x;
}

function getMouseY() {
  return y;
}

text_truncate = function(str, length, ending) {
    if (length == null) {
      length = 100;
    }
    if (ending == null) {
      ending = '...';
    }
    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    } else {
      return str;
    }
  };

function create_and_display_info (techniques, selectionString) {
    if ($('#technique_content').css('display') !== 'block') {
        var posX = getMouseX() + 20;
        var posY = getMouseY();
        //$('#technique_content').empty();
        $("#technique_content").css({
            'border':'1px solid #e3e3e3',
            'text-align': 'left',
            'overflow':'hidden',
            'padding':'2px',
            'margin':2,
            'position':'absolute',
            'z-index':2147483647,
            'border-radius':'3px',
            'box-shadow':'3px 3px 9px 5px rgba(0,0,0,0.33)',
            'top': posY,
            'left': posX,
            'background-color': 'white',
            'max-width': '450px',
            'word-wrap': 'break-word',
            'font-family': 'Arial, Helvetica, sans-serif'
        });
        $("#technique_logo").css({
            'height': 'auto'
            //'float': 'right'
        });
        $('.technique_description').css({
            // 'word-wrap': 'break-word',
            //'overflow-wrap': 'word-break'
            // 'white-space': 'pre-wrap',
            // 'padding': '1px',
            // 'max-width': '300px'
        });
        display_techniques(techniques, selectionString);
    }
}

function display_techniques(techniques, selectionString) {
    const url = chrome.runtime.getURL('favicon.png');

    var desc = text_truncate(techniques[0].description, options.description_length, "...");

    var tactic = "";
    $.each(techniques[0].kill_chain_phases, function(i, item) {
        if (item.kill_chain_name == "mitre-attack") {
            tactic += item.phase_name.replace(/\-/g, ' ');
            if (i != techniques[0].kill_chain_phases.length - 1) {
                tactic += "  ";
            }
        }
    });

    $('#technique_content').append('<img id="technique_logo" align="right" src="' + url + '">');
    $("#technique_content").append("<h3>" + selectionString + "-" + techniques[0].name + "</h3>");
    $("#technique_content").append('<p style="text-transform: capitalize;">Tactic: ' + tactic.replace(/\W\W/g, ', ') + '</p>');
    $("#technique_content").append('<p class="technique_description">Description: ' + desc + '</p>');
    $("#technique_content").append('<p>Link: <a target="_blank" rel="noopener noreferrer" href="https://attack.mitre.org/techniques/' + selectionString + '/">View ' + selectionString + ' on the MITRE ATT&CK Site</a></p>');
    $('#technique_content').css({'display': 'block'});
}

function hide_pane () {
    $('#technique_content').hide();
    $('#technique_content').empty();

}

function initialize_docs () {
    document.addEventListener('mousemove', onMouseDown);
    // document.addEventListener('mouseEnter', onMouseDown);
    
    const url = chrome.runtime.getURL('data/enterprise-attack.json');

    var xhReq = new XMLHttpRequest();
    xhReq.open("GET", url, false);
    xhReq.send(null);
    const db = JSON.parse(xhReq.responseText);


    function onMouseDown (e) {
            var googleDocument = getGoogleDocument();
            const selection = googleDocument.selectedText;
            const trimmedSelection = String(selection).match(options.trimRegex());
            if (!trimmedSelection) {
                hide_pane();
                return;
            }
            const selectionString = trimmedSelection[2];
            if (!options.isSelectionValid({ selectionString, selection })) {
                hide_pane();
                return;
            }
            var techniques = [];
            $.each( db, function(i, item){
                $.each(item.external_references, function( I_child, item_child){
                    if( item_child.external_id==selectionString) {
                        techniques.push(item);
                        return false;  // end "each" when found
                    }
                });
            });
            create_and_display_info(techniques, selectionString);
        
    }
}

function initialize () {
    document.addEventListener('selectionchange', onSelectionChange);
    
    const url = chrome.runtime.getURL('data/enterprise-attack.json');

    var xhReq = new XMLHttpRequest();
    xhReq.open("GET", url, false);
    xhReq.send(null);
    const db = JSON.parse(xhReq.responseText);


    function onSelectionChange (e) {
        const selection = document.getSelection();
        const trimmedSelection = String(selection).match(options.trimRegex());
        if (!trimmedSelection) {
            hide_pane();
            return;
        }
        const leadingSpaces = trimmedSelection[1];
        const selectionString = trimmedSelection[2];
        const trailingSpaces = trimmedSelection[3];
        if (!options.isSelectionValid({ selectionString, selection })) {
            hide_pane();
            return;
        }
        var techniques = [];
        $.each( db, function(i, item){
            $.each(item.external_references, function( I_child, item_child){
                if( item_child.external_id==selectionString) {
                    techniques.push(item);
                    return false;  // end "each" when found
                }
            });
        });
        create_and_display_info(techniques, selectionString);
        
    }
}

// util google docs

var classNames = {
    paragraph: '.kix-paragraphrenderer',
    line: '.kix-lineview',
    selectionOverlay: '.kix-selection-overlay',
    wordNode: '.kix-wordhtmlgenerator-word-node',
    cursor: '.kix-cursor',
    cursorName: '.kix-cursor-name',
    cursorCaret: '.kix-cursor-caret',
  };

  // Google Docs like to add \u200B, \u200C (&zwnj) and non breaking spaces to make sure the browser shows the text correct.
  // When getting the text, we would prefer to get clean text.
  function cleanDocumentText(text) {
    var cleanedText = text.replace(/[\u200B\u200C]/g, '');
    var nonBreakingSpaces = String.fromCharCode(160);
    var regex = new RegExp(nonBreakingSpaces, 'g');
    cleanedText = cleanedText.replace(regex, ' ');
    return cleanedText;
  }

  function getValidCharactersRegex() {
    return '\\wæøåÆØÅéáÉÁöÖ';
  }

  function isWordBoundary(character) {
    return character.match('[' + getValidCharactersRegex() + ']') == null;
  }

  //- - - - - - - - - - - - - - - - - - - -
  // Get Google Document
  //- - - - - - - - - - - - - - - - - - - -

  // Finds all the text and the caret position in the google docs document.
  function getGoogleDocument() {
    var caret, caretRect;
    var caretIndex = 0;
    var caretLineIndex = 0;
    var caretLine = 0;
    var text = [];
    var nodes = [];
    var lineCount = 0;
    var globalIndex = 0;
    var selectedText = '';
    var exportedSelectionRect = undefined;
    var paragraphrenderers = document.querySelectorAll(classNames.paragraph);

    if (containsUserCaretDom()) {
      caret = getUserCaretDom();
      caretRect = caret.getBoundingClientRect();
    }

    for (var i = 0; i < paragraphrenderers.length; i++) {
      var lineviews = paragraphrenderers[i].querySelectorAll(classNames.line);
      for (var j = 0; j < lineviews.length; j++) {
        var lineText = '';
        var selectionOverlays = lineviews[j].querySelectorAll(classNames.selectionOverlay);
        var wordhtmlgeneratorWordNodes = lineviews[j].querySelectorAll(classNames.wordNode);
        for (var k = 0; k < wordhtmlgeneratorWordNodes.length; k++) {
          var wordhtmlgeneratorWordNodeRect = wordhtmlgeneratorWordNodes[k].getBoundingClientRect();
          if (caretRect) {
            if (doesRectsOverlap(wordhtmlgeneratorWordNodeRect, caretRect)) {
              var caretXStart =
                caretRect.left - wordhtmlgeneratorWordNodeRect.left;
              var localCaretIndex = getLocalCaretIndex(
                caretXStart,
                wordhtmlgeneratorWordNodes[k],
                lineviews[j]
              );
              caretIndex = globalIndex + localCaretIndex;
              caretLineIndex = lineText.length + localCaretIndex;
              caretLine = lineCount;
            }
          }
          var nodeText = cleanDocumentText(
            wordhtmlgeneratorWordNodes[k].textContent
          );
          nodes.push({
            index: globalIndex,
            line: lineCount,
            lineIndex: lineText.length,
            node: wordhtmlgeneratorWordNodes[k],
            lineElement: lineviews[j],
            text: nodeText,
          });

          for (var l = 0; l < selectionOverlays.length; l++) {
            var selectionOverlay = selectionOverlays[l];
            var selectionRect = selectionOverlay.getBoundingClientRect();

            if (selectionRect) exportedSelectionRect = selectionRect;

            if (
              doesRectsOverlap(
                wordhtmlgeneratorWordNodeRect,
                selectionOverlay.getBoundingClientRect()
              )
            ) {
              var selectionStartIndex = getLocalCaretIndex(
                selectionRect.left - wordhtmlgeneratorWordNodeRect.left,
                wordhtmlgeneratorWordNodes[k],
                lineviews[j]
              );
              var selectionEndIndex = getLocalCaretIndex(
                selectionRect.left +
                selectionRect.width -
                wordhtmlgeneratorWordNodeRect.left,
                wordhtmlgeneratorWordNodes[k],
                lineviews[j]
              );
              selectedText += nodeText.substring(
                selectionStartIndex,
                selectionEndIndex
              );
            }
          }

          globalIndex += nodeText.length;
          lineText += nodeText;
        }
        text.push(lineText);
        lineCount++;
      }
    }
    return {
      nodes: nodes,
      text: text,
      selectedText: selectedText,
      caret: {
        index: caretIndex,
        lineIndex: caretLineIndex,
        line: caretLine,
      },
      selectionRect: exportedSelectionRect,
    };
  }

  function doesRangesOverlap(x1, x2, y1, y2) {
    return x1 <= y2 && y1 <= x2;
  }

  // http://stackoverflow.com/questions/306316/determine-if-two-rectangles-overlap-each-other
  function doesRectsOverlap(RectA, RectB) {
    return (
      RectA.left <= RectB.right &&
      RectA.right >= RectB.left &&
      RectA.top <= RectB.bottom &&
      RectA.bottom >= RectB.top
    );
  }

  // The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
  function containsUserCaretDom() {
    var carets = document.querySelectorAll(classNames.cursor);
    for (var i = 0; i < carets.length; i++) {
      var nameDom = carets[i].querySelectorAll(classNames.cursorName);
      var name = nameDom[0].innerText;
      if (!name) return true;
    }
    return false;
  }

  // The kix-cursor contain a kix-cursor-name dom, which is only set when it is not the users cursor
  function getUserCaretDom() {
    var carets = document.querySelectorAll(classNames.cursor);
    for (var i = 0; i < carets.length; i++) {
      var nameDom = carets[i].querySelectorAll(classNames.cursorName);
      var name = nameDom[0].innerText;
      if (!name) return carets[i].querySelectorAll(classNames.cursorCaret)[0];
    }

    throw 'Could not find the users cursor';
  }

  // Gets the caret index on the innerText of the element.
  // caretX: The x coordinate on where the element the caret is located
  // element: The element on which contains the text where in the caret position is
  // simulatedElement: Doing the calculation of the caret position, we need to create a temporary DOM, the DOM will be created as a child to the simulatedElement.
  function getLocalCaretIndex(caretX, element, simulateElement) {
    //Creates a span DOM for each letter
    var text = cleanDocumentText(element.innerText);
    var container = document.createElement('div');
    var letterSpans = [];
    for (var i = 0; i < text.length; i++) {
      var textNode = document.createElement('span');
      textNode.innerText = text[i];
      textNode.style.cssText = element.style.cssText;
      // "pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
      textNode.style.whiteSpace = 'pre';
      letterSpans.push(textNode);
      container.appendChild(textNode);
    }
    container.style.whiteSpace = "nowrap";
    simulateElement.appendChild(container);

    // The caret is usually at the edge of the letter, we find the edge we are closest to.
    var index = 0;
    var currentMinimumDistance = -1;
    var containerRect = container.getBoundingClientRect();
    for (var i = 0; i < letterSpans.length; i++) {
      var rect = letterSpans[i].getBoundingClientRect();
      var left = rect.left - containerRect.left;
      var right = left + rect.width;
      if (currentMinimumDistance == -1) {
        currentMinimumDistance = Math.abs(caretX - left);
      }
      var leftDistance = Math.abs(caretX - left);
      var rightDistance = Math.abs(caretX - right);

      if (leftDistance <= currentMinimumDistance) {
        index = i;
        currentMinimumDistance = leftDistance;
      }

      if (rightDistance <= currentMinimumDistance) {
        index = i + 1;
        currentMinimumDistance = rightDistance;
      }
    }

    //Clean up
    container.remove();
    return index;
  }

  //- - - - - - - - - - - - - - - - - - - -
  //Google Document utils
  //- - - - - - - - - - - - - - - - - - - -
  function findWordAtCaret(googleDocument) {
    var line = googleDocument.text[googleDocument.caret.line];
    if (line.length == 0)
      return {
        word: '',
        startIndex: googleDocument.caret.index,
        endIndex: googleDocument.caret.index,
      };

    var startIndex = googleDocument.caret.lineIndex;
    var endIndex = googleDocument.caret.lineIndex;

    //We are at the end of the line
    if (googleDocument.caret.lineIndex >= line.length) {
      startIndex = line.length - 1;
      endIndex = line.length - 1;
    }

    //Finds the start of the word
    var character = line[startIndex];
    //If we are at the end of the word, the startIndex will result in a word boundary character.
    if (isWordBoundary(character) && startIndex > 0) {
      startIndex--;
      character = line[startIndex];
    }
    while (!isWordBoundary(character) && startIndex > 0) {
      startIndex--;
      character = line[startIndex];
    }

    //Finds the end of the word
    character = line[endIndex];
    while (!isWordBoundary(character) && endIndex < line.length - 1) {
      endIndex++;
      character = line[endIndex];
    }

    var globalStartIndex =
      googleDocument.caret.index - googleDocument.caret.lineIndex + startIndex;
    var globalEndIndex =
      googleDocument.caret.index - googleDocument.caret.lineIndex + endIndex;
    return {
      word: line.substring(startIndex, endIndex).trim(),
      startIndex: globalStartIndex,
      endIndex: globalEndIndex,
    };
    //return line.substring(startIndex, endIndex).trim();
  }

  //- - - - - - - - - - - - - - - - - - - -
  //Highlight
  //- - - - - - - - - - - - - - - - - - - -
  function highlight(startIndex, endIndex, googleDocument) {
    for (var i = 0; i < googleDocument.nodes.length; i++) {
      //Highlight node if its index overlap with the provided index
      if (
        doesRangesOverlap(
          startIndex,
          endIndex,
          googleDocument.nodes[i].index,
          googleDocument.nodes[i].index + googleDocument.nodes[i].text.length
        )
      ) {
        //Only draw highlight if there is text to highlight
        var textToHighlight = getTextInNode(
          startIndex,
          endIndex,
          googleDocument.nodes[i]
        );
        if (!textToHighlight.trim()) continue;

        var parentRect = googleDocument.nodes[i].lineElement.getBoundingClientRect();
        var nodeRect = googleDocument.nodes[i].node.getBoundingClientRect();
        var leftPosOffset = 0;
        var rightPosOffset = nodeRect.width;
        if (startIndex > googleDocument.nodes[i].index) {
          var localIndex = startIndex - googleDocument.nodes[i].index;
          leftPosOffset = getPositionOfIndex(
            localIndex,
            googleDocument.nodes[i].node,
            googleDocument.nodes[i].lineElement
          );
        }

        if (
          endIndex <
          googleDocument.nodes[i].index + googleDocument.nodes[i].text.length
        ) {
          rightPosOffset = getPositionOfIndex(
            endIndex - googleDocument.nodes[i].index,
            googleDocument.nodes[i].node,
            googleDocument.nodes[i].lineElement
          );
        }
        createHighlightNode(
          nodeRect.left - parentRect.left + leftPosOffset,
          nodeRect.top - parentRect.top,
          rightPosOffset - leftPosOffset,
          nodeRect.height,
          googleDocument.nodes[i].lineElement
        );
      }
    }
  }

  function getText(startIndex, endIndex, googleDocument) {
    var text = '';
    for (var i = 0; i < googleDocument.nodes.length; i++) {
      if (
        doesRangesOverlap(
          startIndex,
          endIndex,
          googleDocument.nodes[i].index,
          googleDocument.nodes[i].index + googleDocument.nodes[i].text.length
        )
      ) {
        var textInNode = getTextInNode(
          startIndex,
          endIndex,
          googleDocument.nodes[i]
        );
        text += textInNode;
      }
    }

    return text;
  }

  function getTextInNode(startIndex, endIndex, node) {
    var start = 0;
    var end = node.text.length;
    if (startIndex > node.index) {
      start = startIndex - node.index;
    }
    if (endIndex < node.index + node.text.length) {
      end = endIndex - node.index;
    }
    return node.text.substring(start, end);
  }

  function createHighlightNode(left, top, width, height, parentElement) {
    var highlightNode = document.createElement('div');
    highlightNode.setAttribute('class', 'dictus_highlight_node');
    highlightNode.style.position = 'absolute';
    highlightNode.style.left = left + 'px';
    highlightNode.style.top = top + 'px';
    highlightNode.style.width = width + 'px';
    highlightNode.style.height = height + 'px';
    highlightNode.style.backgroundColor = '#D1E3FF';
    highlightNode.style.color = '#D1E3FF';
    //Fuzzy edges on the highlight
    highlightNode.style.boxShadow = '0px 0px 1px 1px #D1E3FF';

    parentElement.appendChild(highlightNode);
  }

  function removeHighlightNodes() {
    var highlightNodes = document.querySelectorAll(
      '.dictus_highlight_node'
    );
    for(i = 0; i < highlightNodes.length; i++)
    {
            highlightNodes[i].remove();
    }     
  }

  //Index: The index on the local element
  function getPositionOfIndex(index, element, simulateElement) {
    //If index is 0 it is always the left most position of the element
    if (index == 0) {
      return 0;
    }

    //Creates a span DOM for each letter
    var text = cleanDocumentText(element.innerText);
    var container = document.createElement('div');
    var letterSpans = [];
    for (var i = 0; i < index; i++) {
      var textNode = document.createElement('span');
      textNode.innerText = text[i];
      textNode.style.cssText = element.style.cssText;
      //"pre" = if there are multiple white spaces, they will all be rendered. Default behavior is for them to be collapesed
      textNode.style.whiteSpace = 'pre';
      letterSpans.push(textNode);
      container.appendChild(textNode);
    }
    simulateElement.appendChild(container);

    var containerRect = container.getBoundingClientRect();
    var rect = letterSpans[index - 1].getBoundingClientRect();
    var leftPosition = rect.left + rect.width - containerRect.left;

    //Clean up
    container.remove();
    return leftPosition;
  }