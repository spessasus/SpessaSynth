import { WORKLET_PROCESSOR_NAME } from '../synthetizer.js'
import { consoleColors } from '../../utils/other.js'
import { SpessaSynthProcessor } from './main_processor.js'
import { SpessaSynthInfo } from '../../utils/loggin.js'


// noinspection JSUnresolvedReference
registerProcessor(WORKLET_PROCESSOR_NAME, SpessaSynthProcessor);
SpessaSynthInfo("%cProcessor succesfully registered!", consoleColors.recognized);