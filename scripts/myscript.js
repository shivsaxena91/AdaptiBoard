var words = [], tree;
$.ajax({
    url: "../dictionaries/en_US/20k.txt",
    async: false,
    success: function (data) {
        words = data.split("\n");
        words.pop();
    },
    error: function (data) {
        console.log(data)
    }
});


var dictionary = new Typo("en_US", false, false, { dictionaryPath: "../dictionaries" });
var app = angular.module('AdaptiBoard', ['ngAnimate']);

app.controller("prediction_panel_controller", ["$scope", function ($scope) {
    angular.element(document).ready(function () {
        $scope.predictions = [];
        $scope.error_corrections = [];
        $scope.search_results = [];

        var key_pressed = false, prev_keyCode = -1, span_open = false, t1, t2;

        $scope.performUndo = function () {
            document.execCommand('undo', false, null);
            $.bootstrapGrowl("Undo button clicked", {
                type: "info",
                align: "top",
                width: "auto",
                delay: 1500
            });
        }
        $scope.performRedo = function () {
            document.execCommand('redo', false, null);
            $.bootstrapGrowl("Redo button clicked", {
                type: "info",
                align: "top",
                width: "auto",
                delay: 1500
            });
        }

        $scope.item_mouseenter = function (e) {
            $(e.target).addClass("highlight");
        }
        $scope.item_mouseleave = function (e) {
            $(e.target).removeClass("highlight");
        }

        $scope.onKeyUp = function (e) {
            key_pressed = false;
            var key_code = e.keyCode;

            switch (key_code) {
                case 219:   //[ -> undo?
                    $scope.performUndo();
                    //$("#undo_btn").click();
                    break;
                case 221:   //] -> redo?
                    $scope.performRedo();
                    //$("#redo_btn").click();
                    break;
                case 220:   //\ -> numeric toggle?
                    $("#numeric_chkbox").click();
                    break;
            }

            if (!$scope.isAlphaNumeric(key_code)) return true;

            //if (key_code!= 32) {
            //if (!t1) t1 = e.timeStamp;
            //else t2 = e.timeStamp;

            //if (t2) {
            //    if (t2 - t1 < 1500) return true;
            //    t1 = t2;
            //}
            //}


            var _this = $("#typing_canvas"),
            enter_prediction = false,
            numeric_checked = $("#numeric_chkbox").is(":checked"),
            arr_all_words = _this.text().trimRight().match(/\S+/g) || [],
            curr_word = arr_all_words[arr_all_words.length - 1],
            prev_word = arr_all_words[arr_all_words.length - 2];

            if (key_code >= 48 && key_code <= 57 && !numeric_checked) {
                enter_prediction = true;
                $scope.enterPrediction(key_code - 48);
            }
            else if (key_code >= 48 && key_code <= 57 && numeric_checked) {
                $scope.updateErrorList([]);
                $scope.updatePredictions([]);
                $scope.updateSearchResults([]);
                return;
            }

            switch (key_code) {
                case 32:    //space, word complete
                    $scope.updateErrorList([]);
                    $scope.updateSearchResults([]);

                    //get next word predictions
                    $scope.getDatamuse(curr_word, 10);
                    break;
                case 18:    //alt
                    break;
                case 17:    //ctrl
                    break;
                case 8:     //backspace
                    var txt = $("#typing_canvas").html().replace(/&nbsp;/g, ' ');
                    if (txt.length == 0) {
                        $scope.updateErrorList([]);
                        $scope.updatePredictions([]);
                        $scope.updateSearchResults([]);
                    }
                    if (txt[txt.length - 1] == " ") {
                        $scope.updateErrorList([]);
                        $scope.updatePredictions([]);
                        $scope.updateSearchResults([]);
                        $scope.getDatamuse(curr_word, 10);
                    }
                    else $scope.makePredictions(curr_word);
                    break;
                case 46:    //delete
                    break;
                case 9:     //tab
                    break;
                default:
                    $scope.makePredictions(curr_word);
                    break;
            }
        }
        $scope.onKeyDown = function (e) {
            var kc = e.keyCode;
            var ignore_keys = [8, 13, 46, 16, 17, 18, 37, 38, 39, 40];
            if (ignore_keys.indexOf(kc) != -1) return true;

            if (key_pressed && kc == prev_keyCode) {
                e.preventDefault();
                return;
            }
            else if (kc >= 48 && kc <= 57) {
                if (!$("#numeric_chkbox").is(":checked")) e.preventDefault();
            }
            else if (kc == 220 || kc == 221 || kc == 219) {
                e.preventDefault();
            }
            key_pressed = true;
            prev_keyCode = kc;
        }
        $scope.isAlphaNumeric = function (keyCode) {
            return (keyCode >= 65 && keyCode <= 90) || (keyCode >= 48 && keyCode <= 57) || (keyCode == 32 || keyCode == 8);
        }
        $scope.cursorToEnd = function () {
            var contentEditableElement = document.getElementById("typing_canvas");
            var range, selection;
            range = document.createRange();//Create a range (a range is a like the selection but invisible)
            range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
            range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
            selection = window.getSelection();//get the selection object (allows you to change selection)
            selection.removeAllRanges();//remove any selections already made
            selection.addRange(range);//make the range you have just created the visible selection
        }

        $scope.searchDictionary = function (word, num) {
            var list = [], count = 0;
            $.each(words, function (key, value) {
                if (count == num) return false;
                if (value.startsWith(word)) {
                    list.push(value);
                    count++;
                }
            });
            $scope.updateSearchResults(list.reverse());
        }
        $scope.updateSearchResults = function (list) {
            $scope.search_results = list;
        }

        $scope.getTypo = function (word) {
            //gets only 5 words by default
            var error_corrections = dictionary.suggest(word);
            $scope.updateErrorList(error_corrections);
        }
        $scope.updateErrorList = function (list) {
            $scope.error_corrections = list;
        }

        $scope.getDatamuse = function (word, min, type) {
            var predictions = [];
            var obj = {};
            if (!type) {
                obj = {
                    "rel_jja": word,
                    //"rel_trg": word,
                    "rel_bga": word,
                    "max": 50
                }
            }
            else if (type == "syn") {
                obj = {
                    "rel_syn": word,
                    //"rel_spc": word,
                    "max": 50
                }
            }
            $.ajax({
                url: "https://api.datamuse.com/words?",
                method: "GET",
                async: true,
                dataType: "json",
                data: obj,
                success: function (data, status, jqxhr) {
                    var count = 0;
                    if ($scope.numOfCurrentPredictions() + min > 10) min = 10 - $scope.numOfCurrentPredictions();
                    $.each(data, function (key, value) {
                        if (count == min) return false;
                        if (value.word.length > 3) {
                            predictions.push(value.word);
                            count++;
                        }
                    });
                    //var predictions = $.map(data, function (x) { return x.word });
                },
                error: function (jqxhr, status, error) {
                    console.log(error);
                },
                complete: function (jqxhr, status) {
                    $scope.updatePredictions(predictions.reverse());
                    $scope.$digest();
                }
            });
        }
        $scope.updatePredictions = function (list) {
            $scope.predictions = list;
        }

        $scope.makePredictions = function (curr_word) {
            if (dictionary.check(curr_word)) {
                $scope.updateErrorList([]);     //since word exists, remove all correction suggestions
                $scope.updatePredictions([]);
                $scope.updateSearchResults([]);

                $scope.searchDictionary(curr_word, 6);
                if ($scope.numOfCurrentPredictions() < 10)
                    $scope.getDatamuse(curr_word, 10 - $scope.numOfCurrentPredictions(), "syn");
            }
            else {
                $scope.updatePredictions([]);
                $scope.updateSearchResults([]);

                $scope.getTypo(curr_word);
                $scope.getDatamuse(curr_word, 10 - $scope.numOfCurrentPredictions());
                $scope.searchDictionary(curr_word, 10 - $scope.numOfCurrentPredictions());
            }
        }
        $scope.predictionClickHandler = function (e) {
            var prediction_no = parseInt($(e.target).text().trim().split(" - ")[0]);
            $scope.enterPrediction(prediction_no);
        }
        $scope.enterPrediction = function (prediction_no) {
            _canvas = $("#typing_canvas");
            if (prediction_no == 0) prediction_no = 10;
            var prediction = $("#item-" + prediction_no).text().trim().split('- ')[1];
            var txt = _canvas.text();
            var txt_array = _canvas.text().split(" ");


            if (txt[txt.length - 1].trim() != txt[txt.length - 1])     //new word
                txt_array.push(prediction);
            else
                txt_array[txt_array.length - 1] = prediction;

            _canvas.text("");
            _canvas.text(txt_array.join(" "));
            $scope.cursorToEnd();
        }
        $scope.numOfCurrentPredictions = function () {
            return $scope.predictions.length + $scope.error_corrections.length + $scope.search_results.length;
        }
    });
}]);

$(document).ready(function () {
    function setLogoMargin() {
        var margin = 0,
            window_width = $(window).width(),
            header_width = $(".name_header").width()
        if (window_width > 1200) margin = header_width / 3 * -1;
        else if (window_width <= 1200 && window_width > 1000) margin = header_width / 2.5 * -1;
        else if (window_width <= 1000 && window_width > 760) margin = header_width / 1.7 * -1;
        else if (window_width <= 760) margin = header_width * -1;
        $('.adapti_logo').css('margin-left', margin);
    }

    setLogoMargin();
    $(window).resize(function () {
        setLogoMargin();
    });

    var options_numeric = {
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        placement: 'right',
        title: 'Enable this to type in numbers [Shortcut: \' \\ \' ]',

    },
    options_undo = {
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        placement: 'top',
        title: 'Shortcut: \' [ \'',
    },
    options_redo = {
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        placement: 'top',
        title: 'Shortcut: \' ] \'',
    },
    options_theme = {
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        placement: 'left',
        title: 'Change theme',
    }


    $('.numeric-mode-div').tooltip(options_numeric);
    $('#undo_btn').tooltip(options_undo);
    $('#redo_btn').tooltip(options_redo);
    $('#theme_select').tooltip(options_theme);

    $("#numeric_chkbox").on('click', function () {
        var msg = $(this).is(":checked") ? "Numeric mode enabled" : "Numeric mode disabled";

        $.bootstrapGrowl(msg, {
            type: "info",
            align: "top",
            width: "auto",
            delay: 1500
        });
    });

    $("#reduce_font, #increase_font").on('click', function () {
        var _id = $(this).attr("id"),
            _canvas = $("#typing_canvas"),
            font_size = parseInt(_canvas.css('font-size').split("px")[0]),
            msg = "";

        if (_id == "reduce_font") {
            _canvas.css('font-size', font_size - 4 + "px");
            msg = "Font size reduced";
        }
        else {
            _canvas.css('font-size', font_size + 4 + "px");
            msg = "Font size reduced";
        }
        $.bootstrapGrowl(msg, {
            type: "info",
            align: "top",
            width: "auto",
            delay: 1500
        });
    });

    $("#font_select").change(function () {
        switch (parseInt($(this).val())) {
            case 1:
                $("#typing_canvas").css("font-family", "Palatino Linotype");
                break;
            case 2:
                $("#typing_canvas").css("font-family", "Monotype Corsiva");
                break;
            case 3:
                $("#typing_canvas").css("font-family", "Century Gothic");
                break;
        }
        $.bootstrapGrowl("Font changed", {
            type: "info",
            align: "top",
            width: "auto",
            delay: 1500
        });
    });

    $("#theme_select").change(function () {
        switch (parseInt($(this).val())) {
            case 1:
                $("body").removeClass('body');
                break;
            case 2:
                $("body").addClass('body');
                break;
        }
    });

    $("#clear_btn").on('click', function () {
        $("#confirm_modal .modal-footer > .confirmed").attr("id", "clear_confirmed");
        $("#clear_confirmed").bind('click', function () {
            $("#typing_canvas").empty();
            $.bootstrapGrowl("Content cleared successfully", {
                type: "danger",
                align: "top",
                width: "auto",
                delay: 1500
            });
        });
    });
    
    $("#save_btn").on('click', function () {
        var regex1 = /<div\s*[\/]?>/gi,
            regex2 = /<\/div\s*[\/]?>/gi,
            regex3 = /&nbsp;/gm,
            regex4 = /<br>/gi;
            raw_txt = $("#typing_canvas").html(),
            textToSave = raw_txt.replace(regex1, "\n").replace(regex2, '\n').replace(regex3, ' ').replace(regex4, ''),
            textToSaveAsBlob = new Blob([textToSave], { type: "text/plain" }),
            textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob),
            fileNameToSaveAs = "filename",
            downloadLink = document.createElement("a");
    
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        downloadLink.href = textToSaveAsURL;
        downloadLink.onclick = function (event) {
            document.body.removeChild(event.target);
        };
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);

        downloadLink.click();
        $.bootstrapGrowl("Content ready for download", {
            type: "success",
            align: "top",
            width: "auto",
            delay: 1500
        });
    });
});