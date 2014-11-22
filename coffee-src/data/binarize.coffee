#
# Copyright 2013 Eiji Kitamura
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Author: Eiji Kitamura (agektmr@gmail.com)
# 
((root) ->
  debug = false
  BIG_ENDIAN = false
  LITTLE_ENDIAN = true
  TYPE_LENGTH = Uint8Array.BYTES_PER_ELEMENT
  LENGTH_LENGTH = Uint16Array.BYTES_PER_ELEMENT
  BYTES_LENGTH = Uint32Array.BYTES_PER_ELEMENT
  Types =
    NULL: 0
    UNDEFINED: 1
    STRING: 2
    NUMBER: 3
    BOOLEAN: 4
    ARRAY: 5
    OBJECT: 6
    INT8ARRAY: 7
    INT16ARRAY: 8
    INT32ARRAY: 9
    UINT8ARRAY: 10
    UINT16ARRAY: 11
    UINT32ARRAY: 12
    FLOAT32ARRAY: 13
    FLOAT64ARRAY: 14
    ARRAYBUFFER: 15
    BLOB: 16
    FILE: 16
    BUFFER: 17 # Special type for node.js

  if debug
    TypeNames = [
      "NULL"
      "UNDEFINED"
      "STRING"
      "NUMBER"
      "BOOLEAN"
      "ARRAY"
      "OBJECT"
      "INT8ARRAY"
      "INT16ARRAY"
      "INT32ARRAY"
      "UINT8ARRAY"
      "UINT16ARRAY"
      "UINT32ARRAY"
      "FLOAT32ARRAY"
      "FLOAT64ARRAY"
      "ARRAYBUFFER"
      "BLOB"
      "BUFFER"
    ]
  Length = [
    null # Types.NULL
    null # Types.UNDEFINED
    "Uint16" # Types.STRING
    "Float64" # Types.NUMBER
    "Uint8" # Types.BOOLEAN
    null # Types.ARRAY
    null # Types.OBJECT
    "Int8" # Types.INT8ARRAY
    "Int16" # Types.INT16ARRAY
    "Int32" # Types.INT32ARRAY
    "Uint8" # Types.UINT8ARRAY
    "Uint16" # Types.UINT16ARRAY
    "Uint32" # Types.UINT32ARRAY
    "Float32" # Types.FLOAT32ARRAY
    "Float64" # Types.FLOAT64ARRAY
    "Uint8" # Types.ARRAYBUFFER
    "Uint8" # Types.BLOB, Types.FILE
    "Uint8" # Types.BUFFER
  ]
  binary_dump = (view, start, length) ->
    table = []
    endianness = BIG_ENDIAN
    ROW_LENGTH = 40
    table[0] = []
    i = 0

    while i < ROW_LENGTH
      table[0][i] = (if i < 10 then "0" + i.toString(10) else i.toString(10))
      i++
    i = 0
    while i < length
      code = view.getUint8(start + i, endianness)
      index = ~~(i / ROW_LENGTH) + 1
      table[index] = []  if typeof table[index] is "undefined"
      table[index][i % ROW_LENGTH] = (if code < 16 then "0" + code.toString(16) else code.toString(16))
      i++
    console.log "%c" + table[0].join(" "), "font-weight: bold;"
    i = 1
    while i < table.length
      console.log table[i].join(" ")
      i++
    return

  find_type = (obj) ->
    type = `undefined`
    if obj is `undefined`
      type = Types.UNDEFINED
    else if obj is null
      type = Types.NULL
    else
      const_name = obj.constructor.name
      if const_name isnt `undefined`
        
        # return type by .constructor.name if possible
        type = Types[const_name.toUpperCase()]
      else
        
        # Work around when constructor.name is not defined
        switch typeof obj
          when "string"
            type = Types.STRING
          when "number"
            type = Types.NUMBER
          when "boolean"
            type = Types.BOOLEAN
          when "object"
            if obj instanceof Array
              type = Types.ARRAY
            else if obj instanceof Int8Array
              type = Types.INT8ARRAY
            else if obj instanceof Int16Array
              type = Types.INT16ARRAY
            else if obj instanceof Int32Array
              type = Types.INT32ARRAY
            else if obj instanceof Uint8Array
              type = Types.UINT8ARRAY
            else if obj instanceof Uint16Array
              type = Types.UINT16ARRAY
            else if obj instanceof Uint32Array
              type = Types.UINT32ARRAY
            else if obj instanceof Float32Array
              type = Types.FLOAT32ARRAY
            else if obj instanceof Float64Array
              type = Types.FLOAT64ARRAY
            else if obj instanceof ArrayBuffer
              type = Types.ARRAYBUFFER
            else if obj instanceof Blob # including File
              type = Types.BLOB
            else if obj instanceof Buffer # node.js only
              type = Types.BUFFER
            else type = Types.OBJECT  if obj instanceof Object
          else
    type

  utf16_utf8 = (string) ->
    unescape encodeURIComponent(string)

  utf8_utf16 = (bytes) ->
    decodeURIComponent escape(bytes)

  
  ###*
  packs seriarized elements array into a packed ArrayBuffer
  @param  {Array} serialized Serialized array of elements.
  @return {DataView} view of packed binary
  ###
  pack = (serialized) ->
    cursor = 0
    i = 0
    j = 0
    endianness = BIG_ENDIAN
    ab = new ArrayBuffer(serialized[0].byte_length + serialized[0].header_size)
    view = new DataView(ab)
    i = 0
    while i < serialized.length
      start = cursor
      header_size = serialized[i].header_size
      type = serialized[i].type
      length = serialized[i].length
      value = serialized[i].value
      byte_length = serialized[i].byte_length
      type_name = Length[type]
      unit = (if type_name is null then 0 else root[type_name + "Array"].BYTES_PER_ELEMENT)
      
      # Set type
      if type is Types.BUFFER
        
        # on node.js Blob is emulated using Buffer type
        view.setUint8 cursor, Types.BLOB, endianness
      else
        view.setUint8 cursor, type, endianness
      cursor += TYPE_LENGTH
      console.info "Packing", type, TypeNames[type]  if debug
      
      # Set length if required
      if type is Types.ARRAY or type is Types.OBJECT
        view.setUint16 cursor, length, endianness
        cursor += LENGTH_LENGTH
        console.info "Content Length", length  if debug
      
      # Set byte length
      view.setUint32 cursor, byte_length, endianness
      cursor += BYTES_LENGTH
      if debug
        console.info "Header Size", header_size, "bytes"
        console.info "Byte Length", byte_length, "bytes"
      switch type
        
        # NULL and UNDEFINED doesn't have any payload
        when Types.NULL, Types.UNDEFINED, Types.STRING
          console.info "Actual Content %c\"" + value + "\"", "font-weight:bold;"  if debug
          j = 0
          while j < length
            view.setUint16 cursor, value.charCodeAt(j), endianness
            j++
            cursor += unit
        when Types.NUMBER, Types.BOOLEAN
          console.info "%c" + value.toString(), "font-weight:bold;"  if debug
          view["set" + type_name] cursor, value, endianness
          cursor += unit
        when Types.INT8ARRAY, Types.INT16ARRAY, Types.INT32ARRAY, Types.UINT8ARRAY, Types.UINT16ARRAY, Types.UINT32ARRAY, Types.FLOAT32ARRAY, Types.FLOAT64ARRAY
          _view = new Uint8Array(view.buffer, cursor, byte_length)
          _view.set new Uint8Array(value.buffer)
          cursor += byte_length
        when Types.ARRAYBUFFER, Types.BUFFER
          _view = new Uint8Array(view.buffer, cursor, byte_length)
          _view.set new Uint8Array(value)
          cursor += byte_length
        when Types.BLOB, Types.ARRAY, Types.OBJECT
        else
          throw "TypeError: Unexpected type found."
      binary_dump view, start, cursor - start  if debug
      i++
    view

  
  ###*
  Unpack binary data into an object with value and cursor
  @param  {DataView} view [description]
  @param  {Number} cursor [description]
  @return {Object}
  ###
  unpack = (view, cursor) ->
    i = 0
    endianness = BIG_ENDIAN
    start = cursor
    type = undefined
    length = undefined
    byte_length = undefined
    value = undefined
    elem = undefined
    
    # Retrieve "type"
    type = view.getUint8(cursor, endianness)
    cursor += TYPE_LENGTH
    console.info "Unpacking", type, TypeNames[type]  if debug
    
    # Retrieve "length"
    if type is Types.ARRAY or type is Types.OBJECT
      length = view.getUint16(cursor, endianness)
      cursor += LENGTH_LENGTH
      console.info "Content Length", length  if debug
    
    # Retrieve "byte_length"
    byte_length = view.getUint32(cursor, endianness)
    cursor += BYTES_LENGTH
    console.info "Byte Length", byte_length, "bytes"  if debug
    type_name = Length[type]
    unit = (if type_name is null then 0 else root[type_name + "Array"].BYTES_PER_ELEMENT)
    switch type
      when Types.NULL, Types.UNDEFINED
        binary_dump view, start, cursor - start  if debug
        
        # NULL and UNDEFINED doesn't have any octet
        value = null
      when Types.STRING
        length = byte_length / unit
        string = []
        i = 0
        while i < length
          code = view.getUint16(cursor, endianness)
          cursor += unit
          string.push String.fromCharCode(code)
          i++
        value = string.join("")
        if debug
          console.info "Actual Content %c\"" + value + "\"", "font-weight:bold;"
          binary_dump view, start, cursor - start
      when Types.NUMBER
        value = view.getFloat64(cursor, endianness)
        cursor += unit
        if debug
          console.info "Actual Content %c\"" + value.toString() + "\"", "font-weight:bold;"
          binary_dump view, start, cursor - start
      when Types.BOOLEAN
        value = (if view.getUint8(cursor, endianness) is 1 then true else false)
        cursor += unit
        if debug
          console.info "Actual Content %c\"" + value.toString() + "\"", "font-weight:bold;"
          binary_dump view, start, cursor - start
      when Types.INT8ARRAY, Types.INT16ARRAY, Types.INT32ARRAY, Types.UINT8ARRAY, Types.UINT16ARRAY, Types.UINT32ARRAY, Types.FLOAT32ARRAY, Types.FLOAT64ARRAY, Types.ARRAYBUFFER
        elem = view.buffer.slice(cursor, cursor + byte_length)
        cursor += byte_length
        
        # If ArrayBuffer
        if type is Types.ARRAYBUFFER
          value = elem
        
        # If other TypedArray
        else
          value = new root[type_name + "Array"](elem)
        binary_dump view, start, cursor - start  if debug
      when Types.BLOB
        binary_dump view, start, cursor - start  if debug
        
        # If Blob is available (on browser)
        if root.Blob
          mime = unpack(view, cursor)
          buffer = unpack(view, mime.cursor)
          cursor = buffer.cursor
          value = new Blob([buffer.value],
            type: mime.value
          )
        else
          
          # node.js implementation goes here
          elem = view.buffer.slice(cursor, cursor + byte_length)
          cursor += byte_length
          
          # node.js implementatino uses Buffer to help Blob
          value = new Buffer(elem)
      when Types.ARRAY
        binary_dump view, start, cursor - start  if debug
        value = []
        i = 0
        while i < length
          
          # Retrieve array element
          elem = unpack(view, cursor)
          cursor = elem.cursor
          value.push elem.value
          i++
      when Types.OBJECT
        binary_dump view, start, cursor - start  if debug
        value = {}
        i = 0
        while i < length
          
          # Retrieve object key and value in sequence
          key = unpack(view, cursor)
          val = unpack(view, key.cursor)
          cursor = val.cursor
          value[key.value] = val.value
          i++
      else
        throw "TypeError: Type not supported."
    value: value
    cursor: cursor

  
  ###*
  deferred function to process multiple serialization in order
  @param  {array}   array    [description]
  @param  {Function} callback [description]
  @return {void} no return value
  ###
  deferredSerialize = (array, callback) ->
    length = array.length
    results = []
    count = 0
    byte_length = 0
    i = 0

    while i < array.length
      ((index) ->
        serialize array[index], (result) ->
          
          # store results in order
          results[index] = result
          
          # count byte length
          byte_length += result[0].header_size + result[0].byte_length
          
          # when all results are on table
          if ++count is length
            
            # finally concatenate all reuslts into a single array in order
            array = []
            j = 0

            while j < results.length
              array = array.concat(results[j])
              j++
            callback array, byte_length
          return

        return
      ) i
      i++
    return

  
  ###*
  Serializes object and return byte_length
  @param  {mixed} obj JavaScript object you want to serialize
  @return {Array} Serialized array object
  ###
  serialize = (obj, callback) ->
    subarray = []
    unit = 1
    header_size = TYPE_LENGTH + BYTES_LENGTH
    type = undefined
    byte_length = 0
    length = 0
    value = obj
    type = find_type(obj)
    unit = (if Length[type] is `undefined` or Length[type] is null then 0 else root[Length[type] + "Array"].BYTES_PER_ELEMENT)
    switch type
      when Types.UNDEFINED, Types.NULL, Types.NUMBER, Types.BOOLEAN
        byte_length = unit
      when Types.STRING
        length = obj.length
        byte_length += length * unit
      when Types.INT8ARRAY, Types.INT16ARRAY, Types.INT32ARRAY, Types.UINT8ARRAY, Types.UINT16ARRAY, Types.UINT32ARRAY, Types.FLOAT32ARRAY, Types.FLOAT64ARRAY
        length = obj.length
        byte_length += length * unit
      when Types.ARRAY
        deferredSerialize obj, (subarray, byte_length) ->
          callback [
            type: type
            length: obj.length
            header_size: header_size + LENGTH_LENGTH
            byte_length: byte_length
            value: null
          ].concat(subarray)
          return

        return
      when Types.OBJECT
        deferred = []
        for key of obj
          if obj.hasOwnProperty(key)
            deferred.push key
            deferred.push obj[key]
            length++
        deferredSerialize deferred, (subarray, byte_length) ->
          callback [
            type: type
            length: length
            header_size: header_size + LENGTH_LENGTH
            byte_length: byte_length
            value: null
          ].concat(subarray)
          return

        return
      when Types.ARRAYBUFFER
        byte_length += obj.byteLength
      when Types.BLOB
        mime_type = obj.type
        reader = new FileReader()
        reader.onload = (e) ->
          deferredSerialize [
            mime_type
            e.target.result
          ], (subarray, byte_length) ->
            callback [
              type: type
              length: length
              header_size: header_size
              byte_length: byte_length
              value: null
            ].concat(subarray)
            return

          return

        reader.onerror = (e) ->
          throw "FileReader Error: " + ereturn

        reader.readAsArrayBuffer obj
        return
      when Types.BUFFER
        byte_length += obj.length
      else
        throw "TypeError: Type \"" + obj.constructor.name + "\" not supported."
    callback [
      type: type
      length: length
      header_size: header_size
      byte_length: byte_length
      value: value
    ].concat(subarray)
    return

  
  ###*
  Deserialize binary and return JavaScript object
  @param  ArrayBuffer buffer ArrayBuffer you want to deserialize
  @return mixed              Retrieved JavaScript object
  ###
  deserialize = (buffer, callback) ->
    view = new DataView(buffer)
    result = unpack(view, 0)
    result.value

  if debug
    root.Test =
      BIG_ENDIAN: BIG_ENDIAN
      LITTLE_ENDIAN: LITTLE_ENDIAN
      Types: Types
      pack: pack
      unpack: unpack
      serialize: serialize
      deserialize: deserialize
  binarize =
    pack: (obj, callback) ->
      try
        console.info "%cPacking Start", "font-weight: bold; color: red;", obj  if debug
        serialize obj, (array) ->
          console.info "Serialized Object", array  if debug
          callback pack(array)
          return

      catch e
        throw e
      return

    unpack: (buffer, callback) ->
      try
        console.info "%cUnpacking Start", "font-weight: bold; color: red;", buffer  if debug
        result = deserialize(buffer)
        console.info "Deserialized Object", result  if debug
        callback result
      catch e
        throw e
      return

  if typeof module isnt "undefined" and module.exports
    module.exports = binarize
  else
    root.binarize = binarize
  return
) (if typeof global isnt "undefined" then global else this)
