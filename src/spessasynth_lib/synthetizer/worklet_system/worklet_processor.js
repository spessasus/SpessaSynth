import { WORKLET_PROCESSOR_NAME } from '../synthetizer.js'
import { consoleColors } from '../../utils/other.js'
import { SpessaSynthProcessor } from './worklet_utilities/main_processor.js'


// noinspection JSUnresolvedReference
registerProcessor(WORKLET_PROCESSOR_NAME, SpessaSynthProcessor);
console.info("%cProcessor succesfully registered!", consoleColors.recognized);