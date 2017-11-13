import * as fs from 'fs';
import { frameworks } from './common';

const dots = require('dot').process({
	path: './'
});

fs.writeFileSync('../index.html', dots.index({
	frameworks
}), {
	encoding: 'utf8'
});
