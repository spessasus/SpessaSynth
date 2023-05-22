onmessage = e =>
{
    /**
     * @type {[number, number]}
     */
    let range =  e.data.range;
    let url = e.data.url;
    fetch(url, {
        method: "GET",
        headers: {
            "Range": `bytes=${range[0]}-${range[1]}`
        }}).then(data => {
            if(!data.ok)
            {
                throw `Server returned ${data.status} ${data.statusText} for ${url}`
            }
            data.arrayBuffer().then(buff => postMessage(new Uint8Array(buff)))
    })

}