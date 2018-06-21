$(document).ready(function () {
    $("#submit").on("click", function (event) {
        event.preventDefault(); //prevents page from refreshing although this means we have to set required fields via javascript

        var trainName = $("#trainName").val().trim();
        var trainDest = $("#trainDestination").val().trim();
        var trainFirstTime = $("#trainFirstTime").val().trim();
        var trainFreq = $("#trainFrequency").val().trim();

        if (trainName && trainDest && trainFirstTime && trainFreq) {
            // console.log($("#select-AMPM").val());
            trainFirstTime += ' ' + $("#select-AMPM").val() + ' ' + moment().format('MM/DD/YYYY'); //captures the date when it was posted and adds it to trainFirstTime
            //this is used when creating a new train so we can set trains to start later in the day
            //and not mess up the next arrival for the train
            //e.g like the in-class activity where we would set the time for the train back a year
            //however this means first train time has a very weird definition that I can't describe.
            // console.log(trainName, trainDest, trainFirstTime, trainFreq);
            database.ref().push({
                name: trainName,
                destination: trainDest,
                frequency: trainFreq,
                firstTime: trainFirstTime
            })
        }
    });
    database.ref().on("child_added", function (snapshot) {
        $("#tableBody").append(trainTableUpdate(snapshot));
    });

    database.ref().on("child_changed", function (snapshot) {
        var currentTableRow = $('#train' + snapshot.key); //selects the current <tr> in the tableBody
        currentTableRow.empty();//empties the content of it since it will contain 4 text inputs and it is much easier to empty it than reset each individual one

        currentTableRow.html(trainTableUpdate(snapshot).html()); //sets the html of the row to the returned row from trainTableUpdate()
        //I suspect this is where the bug originates where the edit and remove buttons won't appear at all
        //when finalizing the edit. There is no error message and no traces of them in the html.
        //this does not happen with child_added database function above.
        //when logging the html of trainTableUpdate(), however, the buttons are there.
        console.log(trainTableUpdate(snapshot).html());
        //however we can re-append those specific buttons and it will work properly
        currentTableRow.append('<button train-key="' + snapshot.key + '"class="edit btn btn-success mt-2">=</button')
            .append('<button train-key="' + snapshot.key + '"class="remove btn btn-danger mt-2 ml-2">X</button');
    });

    function trainTableUpdate(snapshot) {
        var trainKey = snapshot.key; //saves the specific snapshot key to a variable

        var trainRow = $("<tr>").attr({ //creates a new table row with an id of train'KEY'
            //it looks something like this 'train-LFDpKRBl8BH0VyBsry6'
            'id': 'train' + trainKey,
            'edit-mode': false //this is used as a trigger to tell the edit button what to do
        });
        var name = $("<td>").text(snapshot.val().name).attr('id', 'name' + trainKey);
        var dest = $('<td>').text(snapshot.val().destination).attr('id', 'dest' + trainKey);
        var freq = $('<td>').text(snapshot.val().frequency).attr('id', 'freq' + trainKey);
        var editButton = $('<button>').text('=')
            .attr({
                'train-key': trainKey,//stores the snapshot key to the button as a reference to the <tr> and the name, dest, freq sections of the <tb>
                'class': 'edit btn btn-success mt-2'
            });

        var removeButton = $('<button>').text('X')
            .attr({
                'train-key': trainKey,
                'class': 'remove btn btn-danger ml-2 mt-2'
            });



        var time_now = moment().startOf('minute'); //rounds down the seconds to 0. This helps with calculating the difference in minutes as 
        //moment will round up seconds to 60 and add another to the minute
        // var time_now = moment('09:50 18/06/2018', 'HH:mm MM/DD/YYYY'); //tester to set the current time and date

        var firstTime = moment(snapshot.val().firstTime, 'HH:mm A MM/DD/YYYY'); //set first time in HH:mm while also adding MM/DD/YYYY to keep track of date
        var time_diff = time_now.diff(moment(firstTime, 'HH:mm MM/DD/YYYY'), 'minutes');
        var time_remainder = time_diff % freq.text();

        var time_left;
        var next_time;

        if (time_diff > 0) { //if firstTime is scheduled after the current time it will go to the else statement
            time_left = freq.text() - time_remainder;
            next_time = time_now.add(time_left, 'minutes').format('h:mm A MM/DD/YYYY');
        } else {
            time_left = firstTime.diff(time_now, 'minutes');
            next_time = firstTime.format('h:mm A MM/DD/YYYY');
        }

        // console.log(time_now, firstTime, time_diff);

        var next = $('<td>').text(next_time).attr('id', 'first' + trainKey); //this has an attribute so when the user clicks the 'edit' button
        //this section will be setting the FirstTime of the train
        var timeLeft = $('<td>').text(time_left);
        trainRow.append(name, dest, freq, next, timeLeft, editButton, removeButton);
        return trainRow; //will return the <tr>
    }

    var oldName, oldDest, oldFirst, oldFreq; //these are set here as to be outside of the scope so that the else statement could access it
    //setting them right outside of the function seemed to reset them everytime the edit button
    //was pressed.
    $("#tableBody").on("click", ".edit", function () { //this button uses the 'edit-mode' attribute of the <tr>'s as a duel-function switch
        var currentTrain = $(this).attr('train-key');
        var noChanges = false;
        if (($("#train" + currentTrain).attr('edit-mode')) == 'false') {
            $("#train" + currentTrain).attr({
                'edit-mode': true,
                'class': 'bg-secondary'
            });
            //these are stored so that if the user does not type anything in the text inputs it will stay the same
            oldName = $("#name" + currentTrain).text();
            oldDest = $("#dest" + currentTrain).text();
            oldFreq = $("#freq" + currentTrain).text();
            oldFirst = $("#first" + currentTrain).text();
            //These are replacing the <td>'s of the selected <tr> to be inputs instead of normal text 
            $("#name" + currentTrain).html('<input type=text id=new-name' + currentTrain + ' size="12">');
            $("#dest" + currentTrain).html('<input type=text id=new-dest' + currentTrain + ' size="12">');
            $("#freq" + currentTrain).html('<input type=text id=new-freq' + currentTrain + ' size="12">');
            $("#first" + currentTrain).html('<input type=text class="bg-warning" id=new-first' + currentTrain + ' title="CHANGES FIRST TRAIN TIME">');

        } else {
            $("#train" + currentTrain).attr({
                'edit-mode': false,
                'class': ''
            });

            var newName = $("#new-name" + currentTrain).val().trim();
            var newDest = $("#new-dest" + currentTrain).val().trim();
            var newFreq = $("#new-freq" + currentTrain).val().trim();
            var newFirst = $("#new-first" + currentTrain).val().trim();
            //allows the user to leave input fields blank for a way to not replace the current values
            if (!newName && !newDest && !newFreq && !newFirst) {
                $("#name" + currentTrain).html(oldName);
                $("#dest" + currentTrain).html(oldDest);
                $("#freq" + currentTrain).html(oldFreq);
                $("#first" + currentTrain).html(oldFirst);
            }
            
            if (!newName) {
                newName = oldName;
            }
            if (!newDest) {
                newDest = oldDest;
            }
            if (!newFreq) {
                newFreq = oldFreq;
            }
            if (!newFirst) {
                newFirst = oldFirst;
            }
            // console.log("olds", oldName, oldDest, oldFreq, oldFirst);
            // console.log("news", newName, newDest, newFreq, newFirst);

            database.ref(currentTrain).set({
                name: newName,
                destination: newDest,
                frequency: newFreq,
                firstTime: newFirst
            });
        }

    }).on("click", ".remove", function () {
        var currentTrain = $(this).attr('train-key');
        $('#train' + currentTrain).remove();//removes the specific <tr> associated with that key
        database.ref(currentTrain).remove();//removes the specific key in the database
    });
});