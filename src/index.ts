import express from 'express';
import axios from 'axios';
import yaml from "yaml";
import { getCronJobs } from './k8sFetcher';
import cronParser from 'cron-parser'
import { differenceInMilliseconds, isAfter } from 'date-fns';
import redis from './redis';
import { getJobLogs } from './jobLogs';


// const CRONS_DIR_URL = 'https://api.github.com/repos/navneetlal/gitops-poc/contents/jobs?ref=main'
const CRONS_DIR_URL = process.env.GITHUB_DIR

const app = express();
const PORT = 3000;

// Route to get CronJobs from GitHub YAML file
app.get('/jobs', async (req, res) => {
  try {
    // Fetch contents from GitHub YAML file
    const githubUrl = CRONS_DIR_URL;
    let githubResponse: any = await redis.get('github:repo:job')
    if(!githubResponse) {
      const gitRes = await axios(githubUrl!);
      redis.set('github:repo:job', JSON.stringify(gitRes.data), 'EX', 60 * 60)
      githubResponse = gitRes.data
    } else githubResponse = JSON.parse(githubResponse)
    const files = githubResponse as any[];

    // Extract relevant information and decode content
    const cronJobs = await Promise.all(files.filter((i: any) => i.name != "kustomization.yml").map(async (file: any) => {
      const gitUrl = file.git_url;
      let gitResponse: any = await redis.get(`github:repo:job:${file.sha}`)
      if(!gitResponse) {
        const gitRes = await axios(gitUrl);
        redis.set(`github:repo:job:${file.sha}`, JSON.stringify(gitRes.data), 'EX', 60 * 60)
        gitResponse = gitRes.data
      } else gitResponse = JSON.parse(gitResponse)
      const content = yaml.parse(Buffer.from(gitResponse.content, 'base64').toString('utf8')); // Decode base64 content


      return {
        jobName: content.metadata.name,
        schedule: content.spec.schedule,
        namespace: content.metadata.namespace,
        jobImages: content.spec.jobTemplate.spec.template.spec.containers.map((i: any) => i.image),
        meta: {
          repo: content.metadata.annotations.repo,
          maintainer: {
            name: content.metadata.annotations.maintainer,
            email: content.metadata.annotations.email
          }
        }
      };
    }));

    let cronJobDetails = (await Promise.all(cronJobs.map(c => c.namespace).map(n => getCronJobs(n)))).flat()

    // cronJobDetails[0].

    cronJobDetails.sort((a, b) => differenceInMilliseconds(b.metadata.creationTimestamp, a.metadata.creationTimestamp))

    const result = cronJobs.map(c => {
      const job = cronJobDetails.find(j => j.metadata.ownerReferences[0].name == c.jobName)
      return {
        ...c,
        lastRun : job.status.startTime ? new Date(job.status.startTime) : null,
        nextRun : cronParser.parseExpression(c.schedule).next().toISOString(),
        lastRunStatus : job.status.succeeded > 0 ? "Success" : job.status.failed > 0 ? "Failed" : 'InProgress',
        lastRunDuration : differenceInMilliseconds(job.status.completionTime ? new Date(job.status.completionTime) : new Date(), job.status.startTime ? new Date(job.status.startTime) : new Date()),
        jobs: cronJobDetails.filter(j => j.metadata.ownerReferences[0].name == c.jobName).map(j => ({
          name: j.metadata.name,
          nameSpace: j.metadata.namespace,
          startTime: j.status.startTime,
          completionTime: j.status.completionTime,
          succeeded: j.status.succeeded,
          failed: j.status.failed,
          status: j.status.succeeded > 0 ? "Success" : j.status.failed > 0 ? "Failed" : 'InProgress',
          duration: differenceInMilliseconds(j.status.completionTime ? new Date(j.status.completionTime) : new Date(), j.status.startTime ? new Date(j.status.startTime) : new Date())
        }))
      }
    })

    console.log(JSON.stringify(result, null, 1));

    res.json(result);
  } catch (error) {
    console.error('Error fetching CronJobs:', error);
    res.status(500).json({ error: 'Failed to fetch CronJobs' });
  }
});

app.get('/logs', async (req, res) => {
  const jobName = req.query.jobName as string;
  const namespace = req.query.nameSpace as string;

  res.send(await getJobLogs(jobName, namespace))

  // res.json(await getCronJobs())
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


interface IResponseItem {

  jobName: string;
  schedule: string;
  namespace: string;
  jobImages: string[];
  lastRun: Date;
  lastRunStatus: string;
  lastRunDuration: number;
  nextRun: Date;
  meta: {
    repo: string,
    maintainer: {
      name: string,
      email: string
    }
  }

}