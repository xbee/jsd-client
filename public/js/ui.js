
var images = [];
var imagefns = [];

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.

    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        // Only process image files.
        if (!f.type.match('image.*')) {
            continue;
        }

        output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
            f.size, ' bytes, last modified: ',
            f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
            '</li>');

        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                images.push(e.target.result);
                imagefns.push(theFile.name);

                // Render thumbnail.
                var span = document.createElement('span');
                span.innerHTML = ['<img class="thumb" src="', e.target.result,
                    '" title="', escape(theFile.name), '"/>'].join('');
                document.getElementById('list').insertBefore(span, null);
            };
        })(f);

        // Read in the image file as a data URL.
        reader.readAsDataURL(f);

        // to do some useful with fbr
        var fileBufferReader = new FileBufferReader();

        fileBufferReader.readAsArrayBuffer(f, function(uuid) {
            // var file         = fileBufferReader.chunks[uuid];
            // var listOfChunks = file.listOfChunks;

            // get first chunk, and send using WebRTC data channels
            // NEVER send chunks in loop; otherwise you'll face issues in slow networks
            // remote peer should notify if it is ready for next chunk
            fileBufferReader.getNextChunk(uuid, function(nextChunk, isLastChunk) {
                if(isLastChunk) {
                    alert('File Successfully sent.');
                }
                // sending using WebRTC data channels
                // TODO: need to find the channel
                var peerid = $('#target').val();
                var dc = jsdapp.getDataChannelByPeerId(peerid);
                dc.send(nextChunk);
            });
        });
    } // end of for loop
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
    //document.getElementById('files').addEventListener('change', handleFileSelect, false);

}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Setup the dnd listeners.
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);




