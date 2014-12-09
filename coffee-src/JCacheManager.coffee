#= require LRUCache

JCacheManager = ->
    # TODO: should add size & time? limit support
    CACHE_LIMIT = 1024
    @cache = new LRUCache CACHE_LIMIT
    @size = 0
    return

JCacheManager::contains = (key) ->
    return true  if @cache.has(key) or JStorage.get(key)?
    false

JCacheManager::getData = (key, req) ->
    ab = @cache.get(key)
    result = undefined # base64
    if ab?
        if req?
            result = req.convertResponseType(ab)
        else
            result = PeerImageUtil.convertByteToBase64(ab)
    else
        result = JStorage.get(key)
    result

JCacheManager::getBinaryData = (key) ->
    result = @cache.get(key)
    unless result?
        data = JStorage.get(key)
        result = PeerImageUtil.convertBase64ToByte(data)
    else
        result = new Uint8Array(result)
    result

JCacheManager::putData = (req, ab) ->
    @cache.put(req.getUrl(), ab)
    PeerStatistic.log "===========" + req.getUrl() + " length:" + ab.byteLength
    @size += ab.byteLength
    sdata = req.convertBase64(ab)
    JStorage.put req.getUrl(), sdata, req.getHash(), ab.byteLength
    sdata = req.convertResponseType(ab)  unless req.isResponseTypeBase64()
    sdata
