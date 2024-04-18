import {KubeConfig, BatchV1Api } from '@kubernetes/client-node';

// Load kubeconfig from default location or from KUBECONFIG env variable
const kc = new KubeConfig();

kc.loadFromDefault();

// Create Kubernetes API client
const k8sApi = kc.makeApiClient(BatchV1Api);

// Function to fetch cron jobs and their details
export async function getCronJobs(namespace: string) {
    try {
        // List cron jobspod/k8s-api-deployment-7d647bfbbf-4lt6k
        // const res = await k8sApi.listCronJobForAllNamespaces();
        // const cronJobs = res.body.items;

        const response = await k8sApi.listNamespacedJob(namespace);
        const jobs = response.body.items;

        console.log(jobs)

        return jobs

        // console.log("JOBS1234: ", JSON.stringify(jobs, null, 1));

        // const statuses = await Promise.all(cronJobs.map(async (cronJob) => {
        //     const jobName = cronJob.metadata.name;
        //     const status = await getJobStatus(jobName, namespace);
        //     return { name: jobName, status: status };
        // }));

        // Extract relevant information
        // const jobsInfo = cronJobs.map(async cronJob => {
        //     console.log(JSON.stringify(cronJob, null, 1));
        //     const activeJobs = cronJob.status.active || [];

        //     for (const job of activeJobs) {
        //         const status = await getJobStatus(job.name, job.namespace);
        //         //   console.log(job.name, status);
        //     }



            //   const lastRun = cronJob.status.lastScheduleTime ? new Date(cronJob.status.lastScheduleTime) : null;
            //   const nextRun = cronJob.status.active ? new Date(cronJob.status.active[0].schedulerTime) : null;
            //   const lastDuration = cronJob.status.lastDuration || null;
            //   const lastFailed = cronJob.status.failed ? cronJob.status.failed.toString() : null;

            //   return {
            //     name: cronJob.metadata.name,
            //     namespace: cronJob.metadata.namespace,
            //     lastRun: lastRun,
            //     nextRun: nextRun,
            //     lastDuration: lastDuration,
            //     lastFailed: lastFailed,
            //   };
        // });

        // return jobsInfo;
    } catch (err) {
        console.error('Error fetching cron jobs:', err);
        throw err;
    }
}

async function getJobStatus(jobName, namespace) {
    try {
        const response = await k8sApi.readNamespacedJob(jobName, namespace);
        const job = response.body;
        console.log("JOB", JSON.stringify(response, null, 1));
        const status = job.status;
        return status;
    } catch (err) {
        return err.response.body || err;
    }
}