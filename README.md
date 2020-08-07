
## Must have Downloaded:
1. Node.js
2. Node Process Manager (npm)

## If you do not have everything Downloaded:
1. visit https://nodejs.org/en/download/
2. download the proper installer for your system.  
3. follow steps of Node.js installation wizard until you reach the "Custom Setup" step.
4. select "npm pachage manager" instead of the default "Node.js runtime"
5. click "Next" and continue with the rest of the steps of the wizard

## Get all Files:
1. cloan this repository
2. run "bash setup.sh"
3. populate environment variables in ".env" file with appropriate keys. If you plan on running this on Google Cloud Platform then you can populate the environment variables in the "app.yaml" file instead of the ".env" file. 

## Deploy on Google Cloud Platform:
1. Go to your Google Cloud Platform Console.
2. Make sure it says your intended project name (top left) and then click "Activate Cloud Shell" icon (top right)
3. Click "Launch code editor" (top right of cloud shell)
4. Repeat the "Get all Files" steps in the Google Cloud Platform terminal.
5. Make the website live with: "gcloud app deploy --project [project name(name from top left of step 2)] -v [name of deployment (can be anything)]"
6. Get link to the live website with: "gcloud app browse"