export class SysexEvent
{
    constructor(dataArray, ticks) {
        // skip 0xF0 or 0xF7
        dataArray.shift();

        // read the length and read all the bytes
        let sysexLength = 0;
        while(dataArray.length) {
            let byte = dataArray.shift();
            // extract the first 7 bytes
            sysexLength = (sysexLength << 7) | (byte & 127);

            // if the last byte isn't 1, stop
            if ((byte >> 7) !== 1) {
                break;
            }
        }

        let data = [];
        for (let byte = 0; byte < sysexLength; byte++) {
            data.push(dataArray.shift());
        }
        this.type = "System Exclusive";
        this.ticks = ticks;
        this.data = data;
    }
}