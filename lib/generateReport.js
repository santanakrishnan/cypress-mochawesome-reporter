const path = require('path');
const fse = require('fs-extra');
const { merge } = require('mochawesome-merge');
const reportGenerator = require('mochawesome-report-generator');
const { getConfig } = require('./config');
const { log, debugLog } = require('./logger');
const { enhanceReport } = require('./enhanceReport');

async function mergeAndCreate(jsonDir, screenshotsDir, mochawesomeOptions) {
  log(`Read and merge jsons from "${jsonDir}"`);

  const report = await merge({
    files: [jsonDir.concat('/*.json')],
  });
  const data1 = JSON.stringify(report,null,2);

  // write JSON string to a file
  fse.writeFile('cypress-mochawesome/output.json', data1, (err) => {
      if (err) {
          throw err;
      }
      log("JSON data is saved.");
  });
  debugLog(`report before enhance: ${JSON.stringify(report)}`);

  log('Enhance report');
  enhanceReport(report, mochawesomeOptions, screenshotsDir);

  debugLog(`report after enhance: ${JSON.stringify(report)}`);

  log('Create HTML report');

  const html = await reportGenerator.create(report, {
    reportFilename: 'index.html',
    ...mochawesomeOptions,
  });

   const data = JSON.stringify(report,null,2);

  // write JSON string to a file
  fse.writeFile('cypress-mochawesome/output_screenshot.json', data, (err) => {
      if (err) {
          throw err;
      }
      log("JSON data with screenshot is saved.");
  });
  debugLog(`HTML result: ${JSON.stringify(html)}`);

  return { htmlPath: html[0], report };
}

async function copyMediaDir(inputDir, outputDir) {
  const isExists = fse.existsSync(inputDir);

  if (isExists) {
    if (inputDir !== outputDir) {
      log(`Copy media folder from "${inputDir}" to "${outputDir}"`);

      await fse.copy(inputDir, outputDir, { recursive: true });
    }
  } else {
    log(`Media folder "${inputDir}" not found, nothing to copy`);
  }
}

async function generateReport() {
  log('Start generate report process');

  const { outputDir, reporterOptions, screenshotsDir, videosFolder, jsonDir, removeJsonsFolderAfterMerge } =
    getConfig();

  const actions = [mergeAndCreate(jsonDir, screenshotsDir, reporterOptions)];

  if (!reporterOptions.embeddedScreenshots) {
    actions.push(copyMediaDir(screenshotsDir, path.join(outputDir, 'screenshots')));
  }
  if (fse.pathExistsSync(videosFolder) && !reporterOptions.ignoreVideos) {
    actions.push(copyMediaDir(videosFolder, path.join(outputDir, 'videos')));
  }

  const [{ htmlPath, report }] = await Promise.all(actions);

  log('HTML report successfully created!');
  log(htmlPath);

  if (removeJsonsFolderAfterMerge) {
    await fse.remove(jsonDir);
  }

  return report;
}

module.exports = generateReport;
