/**
 * Note: use https://github.com/davglass/license-checker to genarate JSON
 */

const fs = require("fs");

/**
* Reads license information from the specified JSON file and generates ThirdPartyNotices.txt.
* @param {string} jsonFilePath - The path to the JSON file containing the license information.
* @param {string} outputFileName - The filename of the output text file. The default is 'ThirdPartyNotices.txt'.
*/
async function generateThirdPartyNotices(jsonFilePath, outputFileName = "ThirdPartyNotices.txt") {
    try {
        const jsonData = fs.readFileSync(jsonFilePath, "utf8");
        const licenses = JSON.parse(jsonData);

        let noticesContent = "";

        for (const packageName in licenses) {
            const licenseInfo = licenses[packageName];
            const licenseFilePath = licenseInfo.licenseFile;
            const repository = licenseInfo.repository;
            const publisher = licenseInfo.publisher;

            if (licenseFilePath && fs.existsSync(licenseFilePath)) {
                const licenseContent = fs.readFileSync(licenseFilePath, "utf8");
                noticesContent += `--- Package: ${packageName} ---\n`;
                if (repository) {
                    noticesContent += `Repository: ${repository}\n`;
                }
                if (publisher) {
                    noticesContent += `Publisher: ${publisher}\n`;
                }
                noticesContent += `\n${licenseContent}\n\n`;
            } else {
                console.warn(
                    `Warning: License file not found for ${packageName} at ${licenseFilePath}`
                );
            }
        }

        fs.writeFileSync(outputFileName, noticesContent, "utf8");
        console.log(`Successfully generated ${outputFileName}`);
    } catch (error) {
        console.error("Error generating ThirdPartyNotices:", error);
    }
}

const jsonPath = process.argv[2];

if (!jsonPath) {
    console.error("Usage: node generateThirdPartyNotices.js <path_to_license_json_file>");
    process.exit(1);
}

generateThirdPartyNotices(jsonPath);
